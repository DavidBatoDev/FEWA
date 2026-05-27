"""
Custom LLM endpoint that Agora Conversational AI calls instead of OpenAI directly.
Handles OpenAI tool calling loop + streams final response back to Agora as SSE.
"""
import asyncio
import json
import logging
import time
import uuid
from typing import AsyncGenerator

from fastapi import APIRouter, Header, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI

from app.config import settings
from app.services.ai_agent import SYSTEM_PROMPT

TOOL_INSTRUCTIONS = """
## TOOL CALLING RULES (MANDATORY — read before the conversation instructions below)
You MUST call tools in the background on every turn — even if the lead only said their name. Calling a tool is REQUIRED on every turn; if no real data was shared, call no_op instead. Never mention tools in your spoken response.

- no_op: Call this ONLY when the lead's message contains absolutely no new information (e.g., purely social openers, "hello", "okay"). If the lead shared ANY new data (name, company, problem, timeline, budget, email, phone), use the appropriate tool instead — NOT no_op.
- extract_lead_info: **REQUIRED in the SAME turn** — call this the moment the lead reveals their name, company, industry, timeline, budget readiness, or decision-maker status. A name alone is enough. Do NOT defer to a later turn. For contact_email or contact_phone: NEVER include these fields unless the lead ALREADY confirmed the spelled-out address in their PREVIOUS message. If the lead just said the email for the first time this turn, do NOT include it yet — wait until after you have read it back and they said yes in a later message.
- capture_pain_point: Call ONCE — the first time the lead clearly describes their core business problem. Do NOT call again even if batching with score_lead.
- detect_objection: Call immediately when the lead expresses hesitation, price concern, need for approval, or doubt about moving forward.
- score_lead + recommend_offer: These two tools MUST always fire TOGETHER in the same turn. Call score_lead once Phase 3 is complete (pain point known + at least 2 of: timeline, decision-maker, budget readiness). Always include recommend_offer in the exact same batch.
- book_discovery_call: Call when the lead is Hot or Warm and explicitly agrees to book a call.
- generate_follow_up: Call at the very end of the conversation before saying goodbye.
You may call multiple tools in a single turn. Never narrate or describe tool calls in your spoken response.
"""
from app.services.tool_executor import run as run_tool, save_transcript_turn

router = APIRouter(tags=["llm"])
logger = logging.getLogger(__name__)

# Tool instructions go FIRST — higher attention weight in gpt-4o-mini.
# Pre-computed so we don't re-concatenate on every request.
_FULL_SYSTEM_PROMPT = TOOL_INSTRUCTIONS + "\n\n" + SYSTEM_PROMPT

# Lazy singleton — created on first use so an empty/missing API key never
# crashes the module import (which would silently unregister the route → 404).
# Connection-pool reuse is still preserved because the same instance is returned
# on every subsequent call.
_openai_client: AsyncOpenAI | None = None


def _get_openai_client() -> AsyncOpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
    return _openai_client


SALES_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "no_op",
            "description": "Call this ONLY when the lead's message contains absolutely no new information to save — purely social openers ('hello', 'okay', 'thanks') with zero data. If the lead revealed their name, company, problem, timeline, budget, email, or phone, use the appropriate tool instead.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "extract_lead_info",
            "description": "Save lead profile information. Call this IMMEDIATELY whenever the lead reveals any of: their name, company name, industry, timeline, budget readiness, decision-maker status, email, or phone number. Even a name alone is enough to call this tool.",
            "parameters": {
                "type": "object",
                "properties": {
                    "contact_name": {"type": "string", "description": "The lead's full name or first name"},
                    "company": {"type": "string"},
                    "industry": {"type": "string"},
                    "timeline": {"type": "string"},
                    "budget_readiness": {"type": "string"},
                    "decision_maker": {"type": "string"},
                    "contact_email": {"type": "string"},
                    "contact_phone": {"type": "string"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "capture_pain_point",
            "description": "Capture the lead's core business problem. Call this IMMEDIATELY when the lead describes any challenge, problem, struggle, or pain they are facing in their business.",
            "parameters": {
                "type": "object",
                "properties": {
                    "pain_point": {"type": "string", "description": "The main business problem or challenge the lead described"},
                    "severity": {"type": "string", "enum": ["high", "medium", "low"]},
                    "context": {"type": "string", "description": "Additional context or details about the pain"},
                },
                "required": ["pain_point"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "detect_objection",
            "description": "Detect a sales objection from the lead's message. Call this when you hear hesitation, price concern, need for approval, or doubt.",
            "parameters": {
                "type": "object",
                "properties": {
                    "objection_type": {
                        "type": "string",
                        "enum": [
                            "price_concern",
                            "needs_approval",
                            "has_supplier",
                            "no_budget",
                            "not_urgent",
                            "wants_proof",
                            "just_browsing",
                        ],
                    },
                    "raw_quote": {"type": "string"},
                },
                "required": ["objection_type"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "score_lead",
            "description": "Score the lead based on all collected information. Call this once you have enough context about pain point, urgency, decision-maker status, and budget.",
            "parameters": {
                "type": "object",
                "properties": {
                    "score": {"type": "integer", "minimum": 0, "maximum": 100},
                    "temperature": {"type": "string", "enum": ["Hot", "Warm", "Cold"]},
                    "score_breakdown": {
                        "type": "object",
                        "properties": {
                            "has_pain_point": {"type": "boolean"},
                            "urgent_timeline": {"type": "boolean"},
                            "is_decision_maker": {"type": "boolean"},
                            "budget_ready": {"type": "boolean"},
                            "contact_provided": {"type": "boolean"},
                            "asked_for_proposal": {"type": "boolean"},
                        },
                    },
                },
                "required": ["score", "temperature"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "recommend_offer",
            "description": "Recommend the most relevant service offer based on the lead's pain point and context.",
            "parameters": {
                "type": "object",
                "properties": {
                    "offer_id": {
                        "type": "string",
                        "enum": [
                            "lead_capture_starter",
                            "growth_campaign_package",
                            "sales_automation_package",
                            "enterprise_workflow_package",
                        ],
                    },
                    "reason": {"type": "string"},
                },
                "required": ["offer_id", "reason"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "book_discovery_call",
            "description": "Book a discovery call with the lead. Call this when the lead is Hot or Warm and agrees to a call.",
            "parameters": {
                "type": "object",
                "properties": {
                    "preferred_day": {"type": "string"},
                    "preferred_time": {"type": "string"},
                    "confirmed": {"type": "boolean"},
                },
                "required": ["confirmed"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_follow_up",
            "description": "Generate a personalized follow-up email after the call ends. Call this at the end of the conversation.",
            "parameters": {
                "type": "object",
                "properties": {
                    "subject": {"type": "string"},
                    "body": {"type": "string"},
                },
                "required": ["subject", "body"],
            },
        },
    },
]


def _make_chunk(content: str, model: str, finish_reason: str | None = None) -> str:
    chunk = {
        "id": f"chatcmpl-{uuid.uuid4().hex[:8]}",
        "object": "chat.completion.chunk",
        "created": int(time.time()),
        "model": model,
        "choices": [
            {
                "index": 0,
                "delta": {"content": content} if content else {},
                "finish_reason": finish_reason,
            }
        ],
    }
    return f"data: {json.dumps(chunk)}\n\n"


TOOL_DETECTION_MODEL = "gpt-4o-mini"
RESPONSE_MODEL = "gpt-4o-mini"


async def _stream_openai(
    messages: list[dict],
    channel: str,
    model: str = "gpt-5-mini",
) -> AsyncGenerator[str, None]:
    # Capture the latest user message BEFORE we mutate the list with tool results.
    user_text = next(
        (m.get("content", "") for m in reversed(messages) if m.get("role") == "user"),
        "",
    )

    try:
        # Round 1: use gpt-4o-mini for fast tool detection (~1s vs ~5s for reasoning models)
        t0 = time.monotonic()
        client = _get_openai_client()
        response = await client.chat.completions.create(
            model=TOOL_DETECTION_MODEL,
            messages=messages,
            tools=SALES_TOOLS,
            tool_choice="required",
            temperature=0,
            max_tokens=500,
        )
        msg = response.choices[0].message
        tool_names = [tc.function.name for tc in msg.tool_calls] if msg.tool_calls else []
        logger.info(
            "OpenAI Round 1 (%s, %.1fs): finish_reason=%r  tools=%s",
            TOOL_DETECTION_MODEL,
            time.monotonic() - t0,
            response.choices[0].finish_reason,
            tool_names or "none",
        )

        if msg.tool_calls:
            tool_call_list = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                }
                for tc in msg.tool_calls
            ]
            messages.append({"role": "assistant", "tool_calls": tool_call_list})

            # Execute all tool calls in parallel
            async def _exec(tc):
                logger.info("Tool call: %s  args=%s", tc.function.name, tc.function.arguments[:200])
                result = await run_tool(tc.function.name, tc.function.arguments, channel)
                logger.info("Tool result: %s  result=%s", tc.function.name, json.dumps(result)[:200])
                return tc.id, result

            tool_results = await asyncio.gather(*[_exec(tc) for tc in msg.tool_calls])

            for tool_call_id, result in tool_results:
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call_id,
                    "content": json.dumps(result),
                })

            # Round 2: stream the final response
            stream = await client.chat.completions.create(
                model=RESPONSE_MODEL,
                messages=messages,
                stream=True,
                max_tokens=500,
            )
        else:
            # No tools fired (safety-net path — shouldn't happen with tool_choice="required")
            assistant_text = msg.content or ""
            if assistant_text:
                yield _make_chunk(assistant_text, RESPONSE_MODEL)
            yield _make_chunk("", RESPONSE_MODEL, finish_reason="stop")
            yield "data: [DONE]\n\n"
            if user_text or assistant_text:
                asyncio.create_task(save_transcript_turn(channel, user_text, assistant_text))
            return

        # Round 2: stream and collect the full assistant response for transcript saving
        assistant_parts: list[str] = []
        async for chunk in stream:
            delta = chunk.choices[0].delta.content if chunk.choices else None
            if delta:
                assistant_parts.append(delta)
            yield f"data: {chunk.model_dump_json()}\n\n"

        yield "data: [DONE]\n\n"

        # Fire-and-forget: persist turn + conditionally trigger summary
        assistant_text = "".join(assistant_parts)
        if user_text or assistant_text:
            asyncio.create_task(save_transcript_turn(channel, user_text, assistant_text))

    except Exception as exc:
        logger.exception("Error in _stream_openai: %s", exc)
        raise


@router.post("/chat/completions")
async def chat_completions(
    request: Request,
    channel: str = Query(default=""),
    authorization: str | None = Header(default=None),
):
    # Validate bearer token if configured
    if settings.custom_llm_api_key:
        expected = f"Bearer {settings.custom_llm_api_key}"
        if authorization != expected:
            raise HTTPException(status_code=401, detail="Unauthorized")

    body = await request.json()
    messages: list[dict] = body.get("messages", [])
    model: str = body.get("model", "gpt-5-mini")

    logger.info(
        "/chat/completions called: channel=%r  model=%r  messages=%d  auth_header_present=%s",
        channel, model, len(messages), authorization is not None,
    )
    logger.debug("Incoming messages (first 3): %s", json.dumps(messages[:3], indent=2, default=str))

    if not messages:
        raise HTTPException(status_code=400, detail="messages is required")

    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")

    # Ensure system prompt is present and inject tool instructions
    if not messages or messages[0].get("role") != "system":
        # Use pre-computed constant (SYSTEM_PROMPT + TOOL_INSTRUCTIONS)
        messages = [{"role": "system", "content": _FULL_SYSTEM_PROMPT}] + messages
    else:
        # Caller sent their own system message — prepend tool rules (higher attention weight)
        messages[0] = {"role": "system", "content": TOOL_INSTRUCTIONS + "\n\n" + messages[0]["content"]}

    # Use working copy so we can append tool results without mutating the original
    working_messages = list(messages)

    return StreamingResponse(
        _stream_openai(working_messages, channel, model),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
