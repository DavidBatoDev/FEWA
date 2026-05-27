import uuid
from datetime import datetime, timezone
from typing import Literal, Optional, cast

from app.db.couchbase import get_collection
from app.models.conversation import Conversation, TranscriptEntry
from app.models.lead import Lead
from app.services.ai_agent import extract_lead_profile
from app.services.lead_scorer import score_lead
from app.services.offer_recommender import recommend_offer

SALES_PROFILE_FIELDS = [
    "name",
    "company",
    "industry",
    "pain_point",
    "current_solution",
    "timeline",
    "budget_readiness",
    "decision_maker",
    "buying_intent",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _safe_string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    result: list[str] = []
    for item in value:
        if isinstance(item, str):
            text = item.strip()
            if text:
                result.append(text)
    return result


def create_lead_and_conversation(
    campaign_id: str = "",
    session_context: Optional[dict[str, str]] = None,
) -> tuple[str, str, Lead, Conversation]:
    ts = now_iso()
    lead_id = f"lead::{uuid.uuid4()}"
    conversation_id = f"conversation::{uuid.uuid4()}"

    lead = Lead(campaign_id=campaign_id or None, created_at=ts, updated_at=ts)
    conversation = Conversation(
        lead_id=lead_id,
        session_context=session_context,
        created_at=ts,
        updated_at=ts,
    )

    leads_col = get_collection("leads")
    conversations_col = get_collection("conversations")
    leads_col.insert(lead_id, lead.model_dump())
    conversations_col.insert(conversation_id, conversation.model_dump())

    return lead_id, conversation_id, lead, conversation


async def refresh_sales_state_from_transcript(
    lead: Lead,
    conversation: Conversation,
    *,
    mark_in_progress: bool = True,
) -> tuple[Lead, Conversation]:
    extracted = await extract_lead_profile(conversation.transcript)

    for field in SALES_PROFILE_FIELDS:
        value = extracted.get(field)
        if value:
            setattr(lead, field, value)

    asked_for_proposal = bool(extracted.get("asked_for_proposal", False))
    lead.asked_for_proposal = asked_for_proposal
    score, temperature, breakdown = score_lead(lead, asked_for_proposal)

    lead.lead_score = score
    lead.lead_temperature = temperature
    lead.score_breakdown = breakdown
    lead.recommended_offer = recommend_offer(lead)
    if mark_in_progress and lead.status not in ("qualified", "disqualified"):
        lead.status = "in_progress"

    conversation.objections = _safe_string_list(extracted.get("objections"))
    conversation.buying_signals = _safe_string_list(extracted.get("buying_signals"))
    lead.objections = list(conversation.objections)
    lead.buying_signals = list(conversation.buying_signals)

    ts = now_iso()
    lead.updated_at = ts
    conversation.updated_at = ts
    return lead, conversation


async def append_turn_and_refresh_sales_state(
    *,
    lead: Lead,
    conversation: Conversation,
    role: str,
    message: str,
    timestamp: Optional[str] = None,
    turn_key: Optional[str] = None,
    mark_in_progress: bool = True,
) -> tuple[Lead, Conversation, bool]:
    normalized_role = role.strip().lower()
    if normalized_role not in ("user", "assistant"):
        raise ValueError("role must be either 'user' or 'assistant'")

    text = message.strip()
    if not text:
        return lead, conversation, False

    if turn_key:
        if turn_key in conversation.processed_turn_keys:
            return lead, conversation, False
        conversation.processed_turn_keys.append(turn_key)

    conversation.transcript.append(
        TranscriptEntry(
            role=cast(Literal["user", "assistant"], normalized_role),
            message=text,
            timestamp=timestamp or now_iso(),
        )
    )

    lead, conversation = await refresh_sales_state_from_transcript(
        lead,
        conversation,
        mark_in_progress=mark_in_progress,
    )
    return lead, conversation, True
