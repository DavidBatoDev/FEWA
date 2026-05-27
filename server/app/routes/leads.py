import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.models.lead import LeadUpdate
from app.services.lead_scorer import score_lead
from app.services.offer_recommender import recommend_offer
from app.services.follow_up import generate_follow_up
from app.db.couchbase import get_collection, get_scope
from app.models.lead import Lead

router = APIRouter(prefix="/leads", tags=["leads"])

DISCOVERY_CALL_STATUSES = {"proposed", "booked", "rescheduled", "cancelled", "completed"}
CONTEXT_DOC_SOURCE_TYPES = {"pdf"}
CONTEXT_EXTRACTION_STATUSES = {"pending", "processed", "failed"}


class LeadContextDocCreateRequest(BaseModel):
    source_type: str = "pdf"
    extraction_status: str = "pending"
    source_name: str = ""
    source_url: str = ""
    raw_payload: dict = {}
    extracted_summary: str = ""
    extracted_fields: dict = {}


class DiscoveryCallCreateRequest(BaseModel):
    conversation_id: str | None = None
    slot_start: str
    slot_end: str | None = None
    timezone: str = "Asia/Manila"
    status: Literal["proposed", "booked", "rescheduled", "cancelled", "completed"] = "booked"
    notes: str = ""


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _build_call_slot_text(slot_start: str, timezone_name: str) -> str:
    return f"{slot_start} ({timezone_name})"


@router.get("")
async def list_leads():
    scope = get_scope()
    query = f"SELECT META().id, * FROM `leads` ORDER BY created_at DESC LIMIT 100"
    result = scope.query(query)
    rows = []
    for row in result:
        doc = row.get("leads", row)
        doc["id"] = row.get("id", "")
        rows.append(doc)
    return {"leads": rows}


@router.get("/{lead_id}")
async def get_lead(lead_id: str):
    leads_col = get_collection("leads")

    try:
        lead_result = leads_col.get(lead_id)
        lead = lead_result.content_as[dict]
        lead["id"] = lead_id
    except Exception:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead["conversation"] = None
    lead["follow_up"] = None

    scope = get_scope()

    conv_query = """
    SELECT META(c).id AS id, c.*
    FROM `conversations` AS c
    USE INDEX (idx_conversations_lead_latest USING GSI)
    WHERE c.lead_id = $lead_id
    ORDER BY c.updated_at DESC, c.created_at DESC
    LIMIT 1
    """
    conv_rows = list(scope.query(conv_query, named_parameters={"lead_id": lead_id}))
    if conv_rows:
        conv = {k: v for k, v in conv_rows[0].items() if k != "id"}
        conv["id"] = conv_rows[0].get("id", "")
        lead["conversation"] = conv

    fu_query = """
    SELECT META(f).id AS id, f.*
    FROM `follow_ups` AS f
    USE INDEX (idx_followups_lead_latest USING GSI)
    WHERE f.lead_id = $lead_id
    ORDER BY f.created_at DESC
    LIMIT 1
    """
    fu_rows = list(scope.query(fu_query, named_parameters={"lead_id": lead_id}))
    if fu_rows:
        fu = {k: v for k, v in fu_rows[0].items() if k != "id"}
        fu["id"] = fu_rows[0].get("id", "")
        lead["follow_up"] = fu

    return lead


@router.patch("/{lead_id}")
async def update_lead(lead_id: str, updates: LeadUpdate):
    leads_col = get_collection("leads")

    try:
        result = leads_col.get(lead_id)
        lead_dict = result.content_as[dict]
    except Exception:
        raise HTTPException(status_code=404, detail="Lead not found")

    patch = updates.model_dump(exclude_none=True)
    lead_dict.update(patch)
    leads_col.replace(lead_id, lead_dict)
    lead_dict["id"] = lead_id
    return lead_dict


@router.post("/{lead_id}/score")
async def score_lead_endpoint(lead_id: str):
    leads_col = get_collection("leads")

    try:
        result = leads_col.get(lead_id)
        lead = Lead(**result.content_as[dict])
    except Exception:
        raise HTTPException(status_code=404, detail="Lead not found")

    score, temperature, breakdown = score_lead(lead, lead.asked_for_proposal or False)
    lead.lead_score = score
    lead.lead_temperature = temperature
    lead.score_breakdown = breakdown
    leads_col.replace(lead_id, lead.model_dump())

    return {
        "lead_id": lead_id,
        "lead_score": score,
        "lead_temperature": temperature,
        "score_breakdown": breakdown,
    }


@router.post("/{lead_id}/recommend-offer")
async def recommend_offer_endpoint(lead_id: str):
    leads_col = get_collection("leads")

    try:
        result = leads_col.get(lead_id)
        lead = Lead(**result.content_as[dict])
    except Exception:
        raise HTTPException(status_code=404, detail="Lead not found")

    offer = recommend_offer(lead)
    lead.recommended_offer = offer
    leads_col.replace(lead_id, lead.model_dump())

    return {"lead_id": lead_id, "recommended_offer": offer}


@router.post("/{lead_id}/context-docs")
async def create_lead_context_doc(lead_id: str, payload: LeadContextDocCreateRequest):
    source_type = payload.source_type.strip().lower()
    if source_type not in CONTEXT_DOC_SOURCE_TYPES:
        raise HTTPException(status_code=400, detail=f"source_type must be one of: {', '.join(sorted(CONTEXT_DOC_SOURCE_TYPES))}")

    extraction_status = payload.extraction_status.strip().lower()
    if extraction_status not in CONTEXT_EXTRACTION_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"extraction_status must be one of: {', '.join(sorted(CONTEXT_EXTRACTION_STATUSES))}",
        )

    leads_col = get_collection("leads")
    context_col = get_collection("lead_context_docs")
    ts = _now_iso()

    try:
        lead_result = leads_col.get(lead_id)
        lead = Lead(**lead_result.content_as[dict])
    except Exception:
        raise HTTPException(status_code=404, detail="Lead not found")

    context_id = f"context::{uuid.uuid4()}"
    source_name = payload.source_name.strip()
    source_url = payload.source_url.strip()
    extracted_summary = payload.extracted_summary.strip()
    notes = {
        "raw_payload": payload.raw_payload or {},
        "extracted_fields": payload.extracted_fields or {},
    }
    doc = {
        "type": "lead_context_doc",
        "lead_id": lead_id,
        "source_type": source_type,
        "source_name": source_name,
        "source_url": source_url,
        "extraction_status": extraction_status,
        "extracted_summary": extracted_summary,
        "data": notes,
        "created_at": ts,
        "updated_at": ts,
    }

    try:
        context_col.insert(context_id, doc)
        lead.context_status = extraction_status
        lead.updated_at = ts
        leads_col.replace(lead_id, lead.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Couchbase error: {exc}") from exc

    response = dict(doc)
    response["id"] = context_id
    return response


@router.get("/{lead_id}/context-docs")
async def list_lead_context_docs(lead_id: str):
    leads_col = get_collection("leads")
    try:
        leads_col.get(lead_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Lead not found")

    scope = get_scope()
    query = """
    SELECT META(c).id AS id, c.*
    FROM `lead_context_docs` AS c
    USE INDEX (idx_context_docs_lead_created USING GSI)
    WHERE c.lead_id = $lead_id
    ORDER BY c.created_at DESC
    LIMIT 50
    """
    rows = list(scope.query(query, named_parameters={"lead_id": lead_id}))
    docs = []
    for row in rows:
        doc = {k: v for k, v in row.items() if k != "id"}
        doc["id"] = row.get("id", "")
        docs.append(doc)
    return {"lead_id": lead_id, "context_docs": docs}


@router.post("/{lead_id}/book-call")
async def book_discovery_call(lead_id: str, payload: DiscoveryCallCreateRequest):
    leads_col = get_collection("leads")
    calls_col = get_collection("discovery_calls")
    conversations_col = get_collection("conversations")

    slot_start = payload.slot_start.strip()
    if not slot_start:
        raise HTTPException(status_code=400, detail="slot_start is required")

    slot_end = payload.slot_end.strip() if payload.slot_end else None
    timezone_name = payload.timezone.strip() or "Asia/Manila"
    status = payload.status.strip().lower()
    if status not in DISCOVERY_CALL_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of: {', '.join(sorted(DISCOVERY_CALL_STATUSES))}")

    try:
        lead_result = leads_col.get(lead_id)
        lead = Lead(**lead_result.content_as[dict])
    except Exception:
        raise HTTPException(status_code=404, detail="Lead not found")

    conversation_id = payload.conversation_id.strip() if payload.conversation_id else None
    if conversation_id:
        try:
            conversation_result = conversations_col.get(conversation_id)
            conversation_doc = conversation_result.content_as[dict]
        except Exception:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if str(conversation_doc.get("lead_id", "")).strip() != lead_id:
            raise HTTPException(status_code=400, detail="Conversation does not belong to the specified lead")

    ts = _now_iso()
    call_id = f"discovery_call::{uuid.uuid4()}"
    doc = {
        "type": "discovery_call",
        "lead_id": lead_id,
        "conversation_id": conversation_id,
        "slot_start": slot_start,
        "slot_end": slot_end,
        "timezone": timezone_name,
        "status": status,
        "notes": payload.notes.strip(),
        "created_at": ts,
        "updated_at": ts,
    }

    try:
        calls_col.insert(call_id, doc)
        lead.call_status = status
        lead.call_slot = _build_call_slot_text(slot_start, timezone_name)
        if status == "booked":
            lead.next_best_action = f"Discovery call booked — {lead.call_slot}"
        elif status == "completed":
            lead.next_best_action = "Discovery call completed"
        elif status == "cancelled":
            lead.next_best_action = "Discovery call cancelled; reschedule if interested"
        else:
            lead.next_best_action = f"Discovery call {status}"
        lead.updated_at = ts
        leads_col.replace(lead_id, lead.model_dump())
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Couchbase error: {exc}") from exc

    response = dict(doc)
    response["id"] = call_id
    return response


@router.get("/{lead_id}/book-calls")
async def list_discovery_calls(lead_id: str):
    leads_col = get_collection("leads")
    try:
        leads_col.get(lead_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Lead not found")

    scope = get_scope()
    query = """
    SELECT META(d).id AS id, d.*
    FROM `discovery_calls` AS d
    USE INDEX (idx_discovery_calls_lead_created USING GSI)
    WHERE d.lead_id = $lead_id
    ORDER BY d.created_at DESC
    LIMIT 100
    """
    rows = list(scope.query(query, named_parameters={"lead_id": lead_id}))
    calls = []
    for row in rows:
        doc = {k: v for k, v in row.items() if k != "id"}
        doc["id"] = row.get("id", "")
        calls.append(doc)

    return {"lead_id": lead_id, "book_calls": calls}


@router.post("/{lead_id}/follow-up")
async def generate_follow_up_endpoint(lead_id: str):
    leads_col = get_collection("leads")
    follow_ups_col = get_collection("follow_ups")

    try:
        result = leads_col.get(lead_id)
        lead = Lead(**result.content_as[dict])
    except Exception:
        raise HTTPException(status_code=404, detail="Lead not found")

    follow_up_data = await generate_follow_up(lead)
    follow_up_id = f"followup::{uuid.uuid4()}"
    ts = _now_iso()
    doc = {
        "type": "follow_up",
        "lead_id": lead_id,
        "subject": follow_up_data["subject"],
        "body": follow_up_data["body"],
        "status": "draft",
        "created_at": ts,
    }
    follow_ups_col.insert(follow_up_id, doc)
    doc["id"] = follow_up_id
    return doc
