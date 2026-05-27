import re
from datetime import datetime, timezone

from couchbase.exceptions import CouchbaseException, DocumentExistsException, DocumentNotFoundException
from fastapi import APIRouter, HTTPException

from app.db.couchbase import get_collection, get_scope
from app.models.campaign import Campaign, CampaignCreate

router = APIRouter(prefix="/campaigns", tags=["campaigns"])

CAMPAIGN_KEY_PREFIX = "campaign::"


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def slugify_campaign_name(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug


@router.post("")
async def create_campaign(payload: CampaignCreate):
    campaign_name = payload.name.strip()
    if not campaign_name:
        raise HTTPException(status_code=400, detail="Campaign name cannot be empty")

    target_industry = payload.target_industry.strip()
    if not target_industry:
        raise HTTPException(status_code=400, detail="target_industry cannot be empty")

    agent_persona = payload.agent_persona.strip()
    if not agent_persona:
        raise HTTPException(status_code=400, detail="agent_persona cannot be empty")

    goal = payload.goal.strip()
    if not goal:
        raise HTTPException(status_code=400, detail="goal cannot be empty")

    campaign_id = slugify_campaign_name(campaign_name)
    if not campaign_id:
        raise HTTPException(status_code=400, detail="Campaign name must include letters or numbers")

    campaign_key = f"{CAMPAIGN_KEY_PREFIX}{campaign_id}"
    campaign = Campaign(
        name=campaign_name,
        target_industry=target_industry,
        agent_persona=agent_persona,
        goal=goal,
        language_mode=payload.language_mode,
        qualification_rules=payload.qualification_rules,
        created_at=now_iso(),
    )

    try:
        campaigns_col = get_collection("campaigns")
        campaigns_col.insert(campaign_key, campaign.model_dump())
    except DocumentExistsException:
        raise HTTPException(status_code=409, detail="Campaign already exists")
    except CouchbaseException as exc:
        raise HTTPException(status_code=503, detail=f"Couchbase error: {exc}") from exc

    response = campaign.model_dump()
    response["id"] = campaign_id
    return response


@router.get("")
async def list_campaigns():
    try:
        scope = get_scope()
        query = "SELECT META().id, * FROM `campaigns` ORDER BY created_at DESC LIMIT 100"
        result = scope.query(query)
    except CouchbaseException as exc:
        raise HTTPException(status_code=503, detail=f"Couchbase error: {exc}") from exc

    campaigns = []
    for row in result:
        doc = row.get("campaigns", row)
        doc_id = row.get("id", "")
        if doc_id.startswith(CAMPAIGN_KEY_PREFIX):
            doc["id"] = doc_id[len(CAMPAIGN_KEY_PREFIX):]
        else:
            doc["id"] = doc_id
        campaigns.append(doc)

    return {"campaigns": campaigns}


@router.get("/{campaign_id}")
async def get_campaign(campaign_id: str):
    campaign_slug = campaign_id.strip()
    if not campaign_slug:
        raise HTTPException(status_code=400, detail="campaign_id is required")

    campaign_key = f"{CAMPAIGN_KEY_PREFIX}{campaign_slug}"

    try:
        campaigns_col = get_collection("campaigns")
        result = campaigns_col.get(campaign_key)
        campaign = result.content_as[dict]
    except DocumentNotFoundException:
        raise HTTPException(status_code=404, detail="Campaign not found")
    except CouchbaseException as exc:
        raise HTTPException(status_code=503, detail=f"Couchbase error: {exc}") from exc

    campaign["id"] = campaign_slug
    return campaign
