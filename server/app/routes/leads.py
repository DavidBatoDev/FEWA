from fastapi import APIRouter, HTTPException
from app.models.lead import LeadUpdate
from app.services.lead_scorer import score_lead
from app.services.offer_recommender import recommend_offer
from app.services.follow_up import generate_follow_up
from app.db.couchbase import get_collection, get_scope
from app.models.lead import Lead

router = APIRouter(prefix="/leads", tags=["leads"])


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

    score, temperature = score_lead(lead)
    lead.lead_score = score
    lead.lead_temperature = temperature
    leads_col.replace(lead_id, lead.model_dump())

    return {"lead_id": lead_id, "lead_score": score, "lead_temperature": temperature}


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


@router.post("/{lead_id}/follow-up")
async def generate_follow_up_endpoint(lead_id: str):
    import uuid
    from datetime import datetime, timezone

    leads_col = get_collection("leads")
    follow_ups_col = get_collection("follow_ups")

    try:
        result = leads_col.get(lead_id)
        lead = Lead(**result.content_as[dict])
    except Exception:
        raise HTTPException(status_code=404, detail="Lead not found")

    follow_up_data = await generate_follow_up(lead)
    follow_up_id = f"followup::{uuid.uuid4()}"
    ts = datetime.now(timezone.utc).isoformat()
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
