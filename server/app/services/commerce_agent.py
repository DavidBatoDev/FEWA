"""
Commerce Agent (Maya) — B2C shopping assistant for Philippine product businesses.

Mirrors the structure of ai_agent.py (Faye, B2B sales). Defines Maya's persona,
the 5-phase conversation flow, OpenAI tool schemas for the 6 commerce tools,
and helpers used by the /commerce/chat/completions endpoint.
"""
from openai import AsyncOpenAI

from app.config import settings
from app.models.conversation import TranscriptEntry


MAYA_SYSTEM_PROMPT = """You are Maya, a warm and helpful AI shopping assistant for FFlow PH — a Philippine e-commerce platform. You help customers shop for shoes through natural voice or chat conversation. You are powered by GPT-4o mini.

Your job: guide the customer from "I'm looking for shoes" all the way to a completed order — naturally, without pressure. Follow this EXACT sequence of phases.

## CONVERSATION PHASES (follow in order)

**PHASE 1 — GREETING**
Goal: Learn who you are talking to.
- If you don't know their name yet, ask: "Before we start, may I know your name?"
- Once you have their name, use it naturally throughout the conversation.

**PHASE 2 — PREFERENCE DISCOVERY**
Goal: Understand what they need. Ask ONE at a time.
1. Use case: "What are you mainly looking for — running, casual, lifestyle, or something specific?"
2. Budget: "Any budget range in mind?"
3. Priorities (only if unclear): "Anything that matters most — comfort, style, durability?"
4. (Optional) Brand preference if they bring it up.
- Do NOT recommend until you have AT LEAST use case + budget.

**PHASE 3 — RECOMMENDATION**
Goal: Show the top 3 matching products.
- Once preferences are clear, call search_products immediately.
- Briefly describe each option in plain language — name, brand, price, and ONE reason it fits.
- Keep the spoken summary under 3 sentences.

**PHASE 4 — COMPARISON & SELECTION**
Goal: Help the customer choose.
- If the customer asks "which is better" or seems torn between two options, call compare_items.
- Speak the trade-off in plain terms — one strength per shoe.
- Wait for the customer to choose one before moving on.

**PHASE 5 — ORDER & CHECKOUT**
Goal: Build a complete order and confirm.
1. When they pick a product, call build_order and collect: full name, delivery address, contact number, quantity (default 1).
2. Once all fields are filled, call verify_order and read back the summary: "[Product] at ₱[price], quantity [N], delivered to [name] at [address]. Did I get that right?"
3. After the customer confirms, call checkout_prep — the system will generate a reference number.
4. Close with: "Your reference number is [REF]. We'll send a confirmation to your email. Thanks for shopping with us!"

## RULES
- Ask ONE question per turn. Never stack multiple questions.
- Use the customer's name at least once per 3 turns once you have it.
- Never recommend a product before search_products fires.
- Never read back order details before all required fields (name + address) are collected.
- Never finalize checkout before the customer has confirmed the verify_order summary.
- Keep responses under 3 sentences — this is a voice conversation.
- If the customer is unsure, offer to compare 2 options rather than push them to decide.
- No prices, no product details, no specs until Phase 3 (search_products has fired).

## ADDRESS & EMAIL CONFIRMATION RULE
Voice transcription mishears addresses and emails frequently. Whenever a customer gives a delivery address or email:
1. Spell back what you heard: "Let me read that back — [address]. Is that correct?"
2. Wait for confirmation in a follow-up message before passing it into build_order.
3. If they correct, apply the correction and read back the updated version once more.
4. Only save AFTER they confirm the corrected version.

Never include an unconfirmed address or email in build_order on the same turn the customer first said it.

Language: If the customer speaks Taglish, respond in Taglish naturally.
Style: Warm, helpful, concise. Sound like a friendly retail assistant — not a search box.
"""


# OpenAI tool schemas for the 6 commerce tools. Mirrors SALES_TOOLS in routes/llm.py.
COMMERCE_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "list_all_products",
            "description": "Show the full product catalog. Call this when the customer asks 'what do you have?', 'show me all shoes', 'what brands do you carry?', or is browsing without a specific use case or budget yet. Do NOT call this after search_products has already fired — use search_products instead.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "no_op",
            "description": "Call this ONLY when the customer's message contains absolutely no new information to save — purely social openers ('hello', 'okay', 'thanks') with zero data. If the customer revealed their name, a preference, a product choice, or contact info, use the appropriate tool instead.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "extract_preferences",
            "description": "Save the customer's shopping preferences. Call this IMMEDIATELY whenever the customer reveals any of: their name, category interest, use case (running/casual/lifestyle/walking), budget, brand preference, shoe size, or priorities (comfort/style/durability). Even one field is enough to fire this tool.",
            "parameters": {
                "type": "object",
                "properties": {
                    "contact_name": {"type": "string", "description": "Customer's first or full name"},
                    "category": {"type": "string", "description": "Product category, e.g. 'shoes'"},
                    "budget": {"type": "integer", "description": "Budget ceiling in PHP. Convert phrases like 'around 8k' to 8000."},
                    "size": {"type": "string"},
                    "brand": {"type": "string", "description": "Preferred brand"},
                    "use_case": {
                        "type": "string",
                        "description": "Primary use case: running, casual, lifestyle, walking, training, skate, work",
                    },
                    "priorities": {
                        "type": "array",
                        "items": {"type": "string", "enum": ["comfort", "style", "durability", "cushioning", "lightweight", "value"]},
                    },
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_products",
            "description": "Search the product catalog for the top 3 matches based on the customer's stated preferences. Call this as soon as you have at least use_case AND budget. Do NOT call this earlier — recommendations must be evidence-based.",
            "parameters": {
                "type": "object",
                "properties": {
                    "use_case": {"type": "string"},
                    "budget": {"type": "integer", "description": "Budget ceiling in PHP"},
                    "brand": {"type": "string"},
                    "priorities": {"type": "array", "items": {"type": "string"}},
                    "limit": {"type": "integer", "minimum": 1, "maximum": 5},
                },
                "required": ["use_case"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compare_items",
            "description": "Compare two products side by side. Call this when the customer asks 'which is better', expresses doubt between two options, or otherwise needs help choosing.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_a_id": {"type": "string", "description": "Product document ID for option A"},
                    "product_b_id": {"type": "string", "description": "Product document ID for option B"},
                    "context": {"type": "string", "description": "Optional context, e.g. 'comparing for long-distance running'"},
                },
                "required": ["product_a_id", "product_b_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "build_order",
            "description": "Start building an order once the customer has picked a product. Collect customer name, delivery address, and phone. Call this every time the customer adds a missing piece of order info.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_id": {"type": "string"},
                    "product_name": {"type": "string"},
                    "brand": {"type": "string"},
                    "unit_price": {"type": "integer"},
                    "quantity": {"type": "integer", "minimum": 1},
                    "customer_name": {"type": "string"},
                    "delivery_address": {"type": "string"},
                    "phone": {"type": "string"},
                    "email": {"type": "string"},
                },
                "required": ["product_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "verify_order",
            "description": "Read the order summary back to the customer for verification. Call this once the order form has product + name + delivery address. The customer must confirm before checkout_prep.",
            "parameters": {
                "type": "object",
                "properties": {
                    "summary": {"type": "string", "description": "Short natural-language summary the agent will read aloud"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "checkout_prep",
            "description": "Finalize the checkout. Call this ONLY after the customer explicitly confirms the verify_order summary. The system generates a reference number and records the order.",
            "parameters": {
                "type": "object",
                "properties": {
                    "payment_method": {
                        "type": "string",
                        "enum": ["cod", "gcash", "card", "bank_transfer"],
                        "description": "Payment method the customer selected. Default to 'cod' if not stated.",
                    },
                    "notes": {"type": "string"},
                },
            },
        },
    },
]


COMMERCE_TOOL_INSTRUCTIONS = """
## TOOL CALLING RULES (MANDATORY — read before the conversation instructions below)
You MUST call a tool in the background on every turn. If the customer's message contains zero new information, call no_op. Never mention tools in your spoken response.

- list_all_products: Fire when the customer wants to see the full catalog before they have stated a use case or budget ("what do you have?", "show all"). Skip once preferences are clear — use search_products instead.
- no_op: ONLY for purely social messages with no new data ("hi", "okay", "thanks"). If the customer shared ANY new info (name, preference, product pick, contact detail, confirmation), use the appropriate tool instead.
- extract_preferences: REQUIRED in the SAME turn the customer reveals their name OR any shopping preference (use case, budget, size, brand, priorities). A name alone is enough.
- search_products: Fire ONCE, the first turn the customer has expressed use_case AND budget. Do NOT call again unless preferences change materially.
- compare_items: Fire when the customer hesitates between two specific options or asks 'which is better'.
- build_order: Fire when the customer picks a product. Re-fire each time a missing field (name/address/phone) gets filled in. NEVER include delivery_address or email unless the customer ALREADY confirmed the spelled-back version in their PREVIOUS message.
- verify_order: Fire once name + delivery_address are confirmed and the product is locked in.
- checkout_prep: Fire ONLY after the customer has explicitly confirmed the verify_order summary ("yes", "tama", "correct").
You may call multiple tools in a single turn. Never narrate or describe tool calls in your spoken response.
"""


def _has_openai_key() -> bool:
    return bool(settings.openai_api_key and settings.openai_api_key.strip())


def _offline_response(transcript: list[TranscriptEntry], language_mode: str = "English") -> str:
    full_text = " ".join([e.message.lower() for e in transcript if e.role == "user"])

    if "name" not in full_text and len(transcript) <= 2:
        return "Hi! I'm Maya, your shopping assistant. May I know your name?"
    if "running" not in full_text and "casual" not in full_text and "lifestyle" not in full_text:
        return "Got it! What kind of shoes are you mainly looking for — running, casual, or lifestyle?"
    if "budget" not in full_text and "pesos" not in full_text and "₱" not in full_text:
        return "Nice. Any budget range in mind?"

    if language_mode == "Taglish":
        return "Sige, hanapan kita ng top picks based sa preferences mo."
    return "Great. Let me pull up some top matches for you."


async def get_commerce_response(
    transcript: list[TranscriptEntry],
    language_mode: str = "English",
) -> str:
    if not _has_openai_key():
        return _offline_response(transcript, language_mode)

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    system = MAYA_SYSTEM_PROMPT
    if language_mode == "Taglish":
        system += "\n\nSpeak in natural Taglish, a mix of Filipino and English common in the Philippines."

    messages = [{"role": "system", "content": system}]
    for entry in transcript:
        messages.append({"role": entry.role, "content": entry.message})

    response = await client.chat.completions.create(
        model="gpt-5-mini",
        messages=messages,
        max_completion_tokens=5000,
    )
    return response.choices[0].message.content or ""


async def generate_commerce_summary(transcript: list[TranscriptEntry]) -> str:
    if not _has_openai_key():
        lines = [f"{e.role.upper()}: {e.message}" for e in transcript[-10:]]
        return "Conversation summary (offline):\n" + "\n".join(lines)

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    conversation_text = "\n".join(f"{e.role.upper()}: {e.message}" for e in transcript)

    prompt = f"""Summarize this shopping conversation in 3-5 sentences for a customer-success team.
Focus on: what the customer was looking for, the recommendation given, whether they completed an order, and any blockers.

Transcript:
{conversation_text}

Write a concise, professional summary."""

    response = await client.chat.completions.create(
        model="gpt-5-mini",
        messages=[{"role": "user", "content": prompt}],
        max_completion_tokens=500,
    )
    return response.choices[0].message.content or ""
