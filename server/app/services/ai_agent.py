from openai import AsyncOpenAI
from app.config import settings
from app.models.conversation import TranscriptEntry
from app.models.lead import Lead, LeadTemperature


def compute_lead_score(lead: Lead, asked_for_proposal: bool = False) -> tuple[int, dict]:
    breakdown = {
        "has_pain_point": bool(lead.pain_point),
        "urgent_timeline": bool(
            lead.timeline and any(kw in lead.timeline.lower() for kw in ("month", "week", "urgent", "asap", "now"))
        ),
        "is_decision_maker": bool(
            lead.decision_maker and any(kw in lead.decision_maker.lower() for kw in ("yes", "owner", "i decide", "ceo", "founder"))
        ),
        "budget_ready": bool(
            lead.budget_readiness and any(kw in lead.budget_readiness.lower() for kw in ("ready", "allocated", "approved", "have"))
        ),
        "contact_provided": bool(lead.email or lead.phone),
        "asked_for_proposal": bool(asked_for_proposal or lead.asked_for_proposal),
    }
    score = sum(20 for v in breakdown.values() if v)
    return score, breakdown


def compute_lead_temperature(score: int) -> LeadTemperature:
    if score >= 80:
        return "Hot"
    if score >= 40:
        return "Warm"
    return "Cold"


def recommend_offer(lead: Lead) -> str:
    pain = (lead.pain_point or "").lower()
    score = lead.lead_score or 0

    if score >= 80 or "enterprise" in pain or "large" in pain:
        return "Enterprise Workflow Package"
    if "lead" in pain or "capture" in pain or "crm" in pain:
        return "Lead Capture Starter"
    if "campaign" in pain or "marketing" in pain or "growth" in pain:
        return "Growth Campaign Package"
    return "Sales Automation Package"

SYSTEM_PROMPT = """You are Faye, an expert business consultant specializing in logistics and marketing for Philippine service businesses, representing Workflow PH — a business automation company. You are powered by GPT-4o mini.

Your domain expertise: you deeply understand logistics operations (freight, delivery, supply chain, fleet management, last-mile delivery) and marketing/growth challenges (lead generation, customer retention, pricing strategy, brand awareness) common in the Philippine market.

Your job: hold a natural, consultative sales conversation that qualifies the lead and moves toward a clear next step. Follow this EXACT sequence of phases — do not skip ahead.

## CONVERSATION PHASES (follow in order)

**PHASE 1 — INTRODUCTION**
Goal: Learn who you are talking to.
- If you don't know their name yet, ask: "Before we dive in, may I know your name?"
- Once you have their name, use it naturally throughout.
- If company or industry is not yet known, ask: "What kind of business do you run?"

**PHASE 2 — PAIN DISCOVERY**
Goal: Understand the core problem.
- Ask: "What's the biggest challenge you're facing in your business right now?"
- Ask one follow-up to clarify the pain: "How long has this been an issue?" or "How is this affecting your day-to-day?"
- Do NOT move to Phase 3 until you have a clear pain point.

**PHASE 3 — QUALIFICATION**
Goal: Assess urgency, budget, and decision authority. Ask ONE at a time.
1. Timeline: "How soon are you hoping to solve this — this month, this quarter, or later?"
2. Decision-maker: "Are you the one who makes the final call on this, or do you consult with others?"
3. Budget: "Do you have a rough budget in mind, or are you still at the exploring stage?"

**PHASE 4 — SCORE AND RECOMMEND**
Goal: Summarize fit and recommend the right package.
- Only after Phase 3 is complete, score the lead and recommend one package.
- Be brief and specific: "Based on what you've shared, [Package Name] looks like the best fit because [specific reason]."

**PHASE 5 — CLOSE / NEXT STEP**
Goal: Secure a clear next step.
- If lead is Hot or Warm: "Would you like to book a short 20-minute discovery call to explore this further? I can note your preferred time."
- If lead declines or is Cold: "No problem. I'll send over a quick summary to your email. What's the best email to reach you?"
- Always end with a concrete action.

## RULES
- Ask ONE question per turn. Never stack multiple questions.
- Use the lead's name at least once per 3 turns.
- Never mention prices, packages, or features until Phase 4.
- Never pressure. If the lead is hesitant, acknowledge and ask an open question.
- Keep responses under 3 sentences — this is a voice conversation.
- If the lead goes off-topic, gently redirect: "That's helpful context. Coming back to [topic]..."

## SCORE + RECOMMEND RULE
When you have enough information to score the lead (Phase 3 complete), you MUST do BOTH of these in the SAME response — they are always a pair:
1. Call score_lead with the score, temperature, and breakdown.
2. In the exact same response, call recommend_offer with the best-fit package.
Never call score_lead without recommend_offer. Never call recommend_offer without score_lead. They fire together or not at all.

## EMAIL CONFIRMATION RULE (strictly follow every time)
This is a voice call — email addresses are frequently misheard AND often given with verbal correction instructions. Follow these steps every time a lead gives their email:

0. **Normalize first.** Before anything else, check if the lead gave correction instructions alongside the email. Apply ALL of them to construct the correct address before reading it back:
   - "without the hyphen" / "no hyphen" → remove all `-` from the local part (before the @)
   - "without the dot" / "no dot" / "no period" → remove all `.` from the local part (before the @)
   - "all one word" / "no spaces" → remove spaces and separators
   - "underscore instead of hyphen" → replace `-` with `_`
   - Numbers spoken as words → convert to digits ("twenty" → "20", "four" → "4")

1. **Spell back the NORMALIZED version** segment by segment using these spoken forms:
   - `.` in the local part → say "dot"  |  `-` → "hyphen"  |  `_` → "underscore"  |  `@` → "at"
   - Read each contiguous segment as a **single whole unit** — do NOT split or add spaces inside a word (e.g., "batubata" → say "batubata", NOT "batu bata" or "batu bato")
   - Example A — no correction given: Lead says "batubata.david20@gmail.com" → You say: "Let me read that back — batubata dot david twenty at gmail dot com. Did I get that right?"
   - Example B — with correction: Lead says "batu-bato.david20@gmail.com without the hyphen and without the dot" → normalize to batubatodavid20@gmail.com → You say: "Let me read that back — batubatodavid twenty at gmail dot com. Did I get that right?"

2. **Wait for confirmation.** Do NOT include the email in any tool call on the same turn you first heard it. Only add it to extract_lead_info AFTER the lead has confirmed in a PREVIOUS message that what you spelled back is correct.

3. **If they correct it**, apply their new corrections, spell the updated version back, and confirm once more before saving.

4. **Only after they confirm** — save the normalized email and continue the conversation.

Never skip step 0. Never read back the raw transcribed version if the lead gave corrections.
"""


def _has_openai_key() -> bool:
    return bool(settings.openai_api_key and settings.openai_api_key.strip())


def _offline_response(transcript: list[TranscriptEntry], language_mode: str = "English") -> str:
    full_text = " ".join([entry.message.lower() for entry in transcript if entry.role == "user"])

    if "timeline" not in full_text and "month" not in full_text and "urgent" not in full_text:
        return "Thanks for sharing that. How soon do you want to improve this, this month, this quarter, or later?"

    if "budget" not in full_text and "proposal" not in full_text and "price" not in full_text:
        return "Got it. Do you already have a budget range in mind, or are you open to a proposal first?"

    if "owner" not in full_text and "decision" not in full_text:
        return "Are you the decision maker for this project, or will someone else approve it?"

    if language_mode == "Taglish":
        return "Based sa shared details mo, mukhang fit ang Sales Automation Package. Gusto mo ba ng short discovery call next?"
    return "Based on what you shared, the Sales Automation Package looks like the best fit. Would you like to book a short discovery call next?"


async def get_agent_response(
    transcript: list[TranscriptEntry],
    language_mode: str = "English",
) -> str:
    if not _has_openai_key():
        return _offline_response(transcript, language_mode)

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    system = SYSTEM_PROMPT
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


async def generate_conversation_summary(transcript: list[TranscriptEntry]) -> str:
    if not _has_openai_key():
        lines = [f"{e.role.upper()}: {e.message}" for e in transcript[-10:]]
        return "Conversation summary (offline):\n" + "\n".join(lines)

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    conversation_text = "\n".join(
        f"{e.role.upper()}: {e.message}" for e in transcript
    )

    prompt = f"""Summarize this sales conversation in 3-5 sentences for a human sales team.
Focus on: what the lead needs, their urgency, budget readiness, and recommended next step.

Transcript:
{conversation_text}

Write a concise, professional summary."""

    response = await client.chat.completions.create(
        model="gpt-5-mini",
        messages=[{"role": "user", "content": prompt}],
        max_completion_tokens=500,
    )
    return response.choices[0].message.content or ""


async def extract_lead_profile(transcript: list[TranscriptEntry]) -> dict:
    if not _has_openai_key():
        full_text = " ".join([entry.message.lower() for entry in transcript if entry.role == "user"])
        inferred_industry = "Logistics" if "logistics" in full_text else None
        inferred_company = "Unknown Company" if "company" in full_text else None

        objections = []
        if "price" in full_text or "pricing" in full_text or "expensive" in full_text:
            objections.append("Wants pricing details first")

        buying_signals = []
        if "urgent" in full_text or "this month" in full_text:
            buying_signals.append("Urgent timeline")
        if "owner" in full_text or "i decide" in full_text or "decision maker" in full_text:
            buying_signals.append("Decision-maker involved")

        return {
            "name": None,
            "company": inferred_company,
            "industry": inferred_industry,
            "pain_point": "Lead generation and follow-up challenges" if "lead" in full_text else None,
            "current_solution": "Manual process" if "manual" in full_text or "spreadsheet" in full_text else None,
            "timeline": "This month" if "this month" in full_text else None,
            "budget_readiness": "Open to proposal" if "proposal" in full_text else None,
            "decision_maker": "Yes" if ("owner" in full_text or "i decide" in full_text) else None,
            "buying_intent": "High" if ("urgent" in full_text or "need" in full_text) else "Medium",
            "objections": objections,
            "buying_signals": buying_signals,
            "asked_for_proposal": ("proposal" in full_text or "price" in full_text or "pricing" in full_text),
        }

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    conversation_text = "\n".join(
        f"{e.role.upper()}: {e.message}" for e in transcript
    )

    prompt = f"""Extract structured sales information from this conversation transcript.

Transcript:
{conversation_text}

Return a JSON object with these fields (use null if not mentioned):
{{
  "name": null,
  "company": null,
  "industry": null,
  "pain_point": null,
  "current_solution": null,
  "timeline": null,
  "budget_readiness": null,
  "decision_maker": null,
  "buying_intent": null,
  "objections": [],
  "buying_signals": [],
  "asked_for_proposal": false
}}

Return only valid JSON, no explanation."""

    response = await client.chat.completions.create(
        model="gpt-5-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )

    import json
    text = response.choices[0].message.content or "{}"
    return json.loads(text)
