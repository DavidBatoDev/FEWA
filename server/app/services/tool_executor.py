"""
Executes the 6 sales tools fired by OpenAI during a voice conversation.
All state is stored in the `leads` Couchbase collection (single source of truth).
Each tool also publishes an SSE event via EventBus for the live frontend panel.
"""
import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

from couchbase.exceptions import CouchbaseException

from app.db.couchbase import get_collection
from app.models.conversation import Conversation, TranscriptEntry
from app.models.lead import Lead
from app.services.event_bus import EventBus

# In-memory session registry: channel_name → {"lead_id": str, "conversation_id": str}
_sessions: dict[str, dict[str, str]] = {}


def register_session(channel_name: str, lead_id: str, conversation_id: str) -> None:
    _sessions[channel_name] = {"lead_id": lead_id, "conversation_id": conversation_id}


def unregister_session(channel_name: str) -> None:
    _sessions.pop(channel_name, None)


def get_session(channel_name: str) -> dict[str, str] | None:
    return _sessions.get(channel_name)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _elapsed(lead_created_at: str) -> str:
    try:
        created = datetime.fromisoformat(lead_created_at)
        delta = datetime.now(timezone.utc) - created
        total = int(delta.total_seconds())
        return f"{total // 60:02d}:{total % 60:02d}"
    except Exception:
        return "00:00"


async def _get_lead(lead_id: str) -> Lead | None:
    # Couchbase sync SDK completes in <15ms on local — direct call is faster
    # than dispatching to a thread pool on Windows due to GIL + scheduler overhead.
    try:
        col = get_collection("leads")
        result = col.get(lead_id)
        return Lead(**result.content_as[dict])
    except CouchbaseException:
        return None


async def _save_lead(lead_id: str, lead: Lead) -> None:
    try:
        col = get_collection("leads")
        lead.updated_at = _now()
        col.upsert(lead_id, lead.model_dump())
    except CouchbaseException:
        pass


async def run(tool_name: str, arguments: str | dict, channel_name: str) -> dict:
    args = arguments if isinstance(arguments, dict) else json.loads(arguments)
    session = get_session(channel_name)
    lead_id = session["lead_id"] if session else f"lead::{uuid.uuid4()}"

    logger.info(
        "Tool executor: tool=%r  channel=%r  session_found=%s  lead_id=%r",
        tool_name, channel_name, bool(session), lead_id,
    )

    handler = _HANDLERS.get(tool_name)
    if handler is None:
        logger.warning("Unknown tool requested: %r", tool_name)
        return {"ok": False, "error": f"Unknown tool: {tool_name}"}

    result = await handler(args, lead_id, channel_name)
    logger.info("Tool %r completed: %s", tool_name, json.dumps(result)[:200])
    return result


async def _handle_extract_lead_info(args: dict, lead_id: str, channel: str) -> dict:
    lead = await _get_lead(lead_id) or Lead(created_at=_now(), updated_at=_now())

    field_map = {
        "company": "company",
        "industry": "industry",
        "pain_point": "pain_point",
        "timeline": "timeline",
        "budget_readiness": "budget_readiness",
        "decision_maker": "decision_maker",
        "contact_name": "name",
        "contact_email": "email",
        "contact_phone": "phone",
    }
    updated_fields: dict[str, str] = {}
    for arg_key, lead_field in field_map.items():
        val = args.get(arg_key)
        if val:
            setattr(lead, lead_field, str(val))
            updated_fields[lead_field] = str(val)

    event = {
        "tool": "extract_lead_info",
        "timestamp": _elapsed(lead.created_at),
        "data": updated_fields,
    }
    await asyncio.gather(_save_lead(lead_id, lead), EventBus.publish(channel, event))
    return {"ok": True, "updated_fields": updated_fields}


async def _handle_capture_pain_point(args: dict, lead_id: str, channel: str) -> dict:
    lead = await _get_lead(lead_id) or Lead(created_at=_now(), updated_at=_now())

    pain_point = args.get("pain_point", "")
    severity = args.get("severity", "")
    context = args.get("context", "")

    if pain_point:
        lead.pain_point = pain_point

    event = {
        "tool": "capture_pain_point",
        "timestamp": _elapsed(lead.created_at),
        "data": {"pain_point": pain_point, "severity": severity, "context": context},
    }
    await asyncio.gather(_save_lead(lead_id, lead), EventBus.publish(channel, event))
    return {"ok": True, "pain_point": pain_point}


async def _handle_detect_objection(args: dict, lead_id: str, channel: str) -> dict:
    lead = await _get_lead(lead_id) or Lead(created_at=_now(), updated_at=_now())

    objection_type = args.get("objection_type", "unknown")
    raw_quote = args.get("raw_quote", "")

    if objection_type not in lead.objections:
        lead.objections.append(objection_type)

    event = {
        "tool": "detect_objection",
        "timestamp": _elapsed(lead.created_at),
        "data": {"objection_type": objection_type, "raw_quote": raw_quote},
    }
    await asyncio.gather(_save_lead(lead_id, lead), EventBus.publish(channel, event))
    return {"ok": True, "objection_type": objection_type}


async def _handle_score_lead(args: dict, lead_id: str, channel: str) -> dict:
    lead = await _get_lead(lead_id) or Lead(created_at=_now(), updated_at=_now())

    score = args.get("score", 0)
    temperature = args.get("temperature", "Cold")
    breakdown = args.get("score_breakdown", {})

    lead.lead_score = score
    lead.lead_temperature = temperature  # type: ignore[assignment]
    lead.score_breakdown = breakdown
    lead.status = "in_progress"
    if temperature in ("Hot", "Warm"):
        lead.is_potential_lead = True

    event = {
        "tool": "score_lead",
        "timestamp": _elapsed(lead.created_at),
        "data": {"score": score, "temperature": temperature, "breakdown": breakdown},
    }
    await asyncio.gather(_save_lead(lead_id, lead), EventBus.publish(channel, event))
    return {"ok": True, "score": score, "temperature": temperature}


async def _handle_recommend_offer(args: dict, lead_id: str, channel: str) -> dict:
    lead = await _get_lead(lead_id) or Lead(created_at=_now(), updated_at=_now())

    offer_id = args.get("offer_id", "sales_automation_package")
    reason = args.get("reason", "")

    offer_display = {
        "lead_capture_starter": "Lead Capture Starter",
        "growth_campaign_package": "Growth Campaign Package",
        "sales_automation_package": "Sales Automation Package",
        "enterprise_workflow_package": "Enterprise Workflow Package",
    }
    offer_name = offer_display.get(offer_id, offer_id)
    lead.recommended_offer = offer_name

    event = {
        "tool": "recommend_offer",
        "timestamp": _elapsed(lead.created_at),
        "data": {"offer_id": offer_id, "offer_name": offer_name, "reason": reason},
    }
    await asyncio.gather(_save_lead(lead_id, lead), EventBus.publish(channel, event))
    return {"ok": True, "offer_name": offer_name}


async def _handle_book_discovery_call(args: dict, lead_id: str, channel: str) -> dict:
    lead = await _get_lead(lead_id) or Lead(created_at=_now(), updated_at=_now())

    preferred_day = args.get("preferred_day", "")
    preferred_time = args.get("preferred_time", "")
    confirmed = args.get("confirmed", False)

    slot = f"{preferred_day} {preferred_time}".strip() or "TBD"
    if confirmed:
        lead.next_best_action = f"Discovery call booked — {slot}"
        lead.status = "qualified"
        lead.is_potential_lead = True
        lead.discovery_call_schedule = slot

    event = {
        "tool": "book_discovery_call",
        "timestamp": _elapsed(lead.created_at),
        "data": {"slot": slot, "confirmed": confirmed, "discovery_call_schedule": slot if confirmed else None},
    }
    # Save only when a booking was confirmed; always publish the SSE event
    tasks = [EventBus.publish(channel, event)]
    if confirmed:
        tasks.append(_save_lead(lead_id, lead))
    await asyncio.gather(*tasks)
    return {"ok": True, "slot": slot, "confirmed": confirmed}


async def _handle_generate_follow_up(args: dict, lead_id: str, channel: str) -> dict:
    lead = await _get_lead(lead_id) or Lead(created_at=_now(), updated_at=_now())

    subject = args.get("subject", "")
    body = args.get("body", "")

    if subject:
        lead.follow_up_subject = subject
    if body:
        lead.follow_up_body = body

    event = {
        "tool": "generate_follow_up",
        "timestamp": _elapsed(lead.created_at),
        "data": {"subject": subject, "body_preview": body[:120] if body else ""},
    }
    await asyncio.gather(_save_lead(lead_id, lead), EventBus.publish(channel, event))
    return {"ok": True, "subject": subject}


async def _get_conversation(conversation_id: str) -> Conversation | None:
    try:
        col = get_collection("conversations")
        result = col.get(conversation_id)
        return Conversation(**result.content_as[dict])
    except CouchbaseException:
        return None


async def _save_conversation(conversation_id: str, conv: Conversation) -> None:
    try:
        col = get_collection("conversations")
        conv.updated_at = _now()
        col.upsert(conversation_id, conv.model_dump())
    except CouchbaseException:
        pass


async def _run_summary(conversation_id: str, lead_id: str, channel: str, transcript: list[TranscriptEntry]) -> None:
    """Generate an OpenAI summary from the transcript and persist it asynchronously."""
    try:
        from app.services.ai_agent import generate_conversation_summary

        summary = await generate_conversation_summary(transcript)
        if not summary:
            return

        # Persist on the conversation doc
        conv = await _get_conversation(conversation_id)
        if conv:
            conv.summary = summary
            await _save_conversation(conversation_id, conv)

        # Mirror onto the lead doc so it shows up in the lead panel
        lead = await _get_lead(lead_id)
        if lead:
            lead.conversation_summary = summary
            await _save_lead(lead_id, lead)

        # Push live SSE update so the frontend panel refreshes
        await EventBus.publish(channel, {
            "tool": "summary_updated",
            "timestamp": _elapsed(lead.created_at) if lead else "00:00",
            "data": {"summary": summary[:300]},
        })

        logger.info("Summary saved for channel=%r  len=%d", channel, len(summary))
    except Exception:
        logger.exception("Background summary generation failed for channel=%r", channel)


async def save_transcript_turn(
    channel: str,
    user_text: str,
    assistant_text: str,
) -> None:
    """Append one user+assistant turn to the Conversation transcript.

    Fires asynchronously after each streamed response.  Every 8 transcript
    entries (= 4 conversational turns) a summary is generated in the
    background via _run_summary.
    """
    session = get_session(channel)
    if not session:
        logger.warning("save_transcript_turn: no session for channel=%r", channel)
        return

    conversation_id = session["conversation_id"]
    lead_id = session["lead_id"]

    conv = await _get_conversation(conversation_id)
    if conv is None:
        conv = Conversation(lead_id=lead_id, created_at=_now(), updated_at=_now())

    ts = _now()
    if user_text:
        conv.transcript.append(TranscriptEntry(role="user", message=user_text, timestamp=ts))
    if assistant_text:
        conv.transcript.append(TranscriptEntry(role="assistant", message=assistant_text, timestamp=ts))

    await _save_conversation(conversation_id, conv)

    total = len(conv.transcript)
    logger.info(
        "Transcript saved: channel=%r  total_entries=%d",
        channel, total,
    )

    # Trigger a summary every 8 transcript entries (≈ 4 turns)
    if total > 0 and total % 8 == 0:
        logger.info("Triggering async summary at %d entries for channel=%r", total, channel)
        asyncio.create_task(
            _run_summary(conversation_id, lead_id, channel, list(conv.transcript))
        )


async def _handle_no_op(args: dict, lead_id: str, channel: str) -> dict:
    """No-op fallback — fired when the model has nothing to capture.
    No DB write and no SSE event; just confirms the tool call succeeded."""
    return {"ok": True}


_HANDLERS = {
    "no_op": _handle_no_op,
    "extract_lead_info": _handle_extract_lead_info,
    "capture_pain_point": _handle_capture_pain_point,
    "detect_objection": _handle_detect_objection,
    "score_lead": _handle_score_lead,
    "recommend_offer": _handle_recommend_offer,
    "book_discovery_call": _handle_book_discovery_call,
    "generate_follow_up": _handle_generate_follow_up,
}
