import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from couchbase.exceptions import CouchbaseException, DocumentNotFoundException
from app.models.lead import Lead
from app.models.conversation import Conversation, TranscriptEntry
from app.services.ai_agent import get_agent_response, extract_lead_profile, generate_conversation_summary
from app.services.lead_scorer import score_lead
from app.services.offer_recommender import recommend_offer
from app.db.couchbase import get_collection

router = APIRouter(prefix="/agent", tags=["agent"])


class StartRequest(BaseModel):
    campaign_id: str = ""


class MessageRequest(BaseModel):
    lead_id: str
    conversation_id: str
    message: str
    language_mode: str = "English"


class EndRequest(BaseModel):
    lead_id: str
    conversation_id: str


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.post("/start")
async def start_conversation(req: StartRequest):
    try:
        lead_id = f"lead::{uuid.uuid4()}"
        conversation_id = f"conversation::{uuid.uuid4()}"
        ts = now_iso()

        lead = Lead(campaign_id=req.campaign_id, created_at=ts, updated_at=ts)
        conversation = Conversation(lead_id=lead_id, created_at=ts, updated_at=ts)

        leads_col = get_collection("leads")
        conversations_col = get_collection("conversations")

        leads_col.insert(lead_id, lead.model_dump())
        conversations_col.insert(conversation_id, conversation.model_dump())

        greeting = (
            "Hi! I'm the Workflow PH Sales Agent. "
            "I'm here to help understand your business and find the best solution for you. "
            "Can you tell me a little about your business and what you're looking to improve?"
        )

        return {
            "lead_id": lead_id,
            "conversation_id": conversation_id,
            "greeting": greeting,
        }
    except CouchbaseException as exc:
        raise HTTPException(status_code=503, detail=f"Couchbase error: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to start conversation: {exc}") from exc


@router.post("/message")
async def handle_message(req: MessageRequest):
    try:
        ts = now_iso()
        conversations_col = get_collection("conversations")
        leads_col = get_collection("leads")

        result = conversations_col.get(req.conversation_id)
        conversation = Conversation(**result.content_as[dict])

        user_entry = TranscriptEntry(role="user", message=req.message, timestamp=ts)
        conversation.transcript.append(user_entry)

        ai_response = await get_agent_response(conversation.transcript, req.language_mode)

        assistant_entry = TranscriptEntry(role="assistant", message=ai_response, timestamp=now_iso())
        conversation.transcript.append(assistant_entry)

        extracted = await extract_lead_profile(conversation.transcript)

        lead_result = leads_col.get(req.lead_id)
        lead = Lead(**lead_result.content_as[dict])

        for field in ["name", "company", "industry", "pain_point", "current_solution",
                      "timeline", "budget_readiness", "decision_maker", "buying_intent"]:
            val = extracted.get(field)
            if val:
                setattr(lead, field, val)

        asked_for_proposal = extracted.get("asked_for_proposal", False)
        score, temperature = score_lead(lead, asked_for_proposal)
        lead.lead_score = score
        lead.lead_temperature = temperature
        lead.recommended_offer = recommend_offer(lead)
        lead.status = "in_progress"
        lead.updated_at = now_iso()

        conversation.objections = extracted.get("objections", [])
        conversation.buying_signals = extracted.get("buying_signals", [])
        conversation.updated_at = now_iso()

        leads_col.replace(req.lead_id, lead.model_dump())
        conversations_col.replace(req.conversation_id, conversation.model_dump())

        return {
            "response": ai_response,
            "lead_profile": lead.model_dump(),
            "lead_score": score,
            "lead_temperature": temperature,
            "recommended_offer": lead.recommended_offer,
            "objections": conversation.objections,
            "buying_signals": conversation.buying_signals,
            "next_best_action": lead.next_best_action,
        }
    except CouchbaseException as exc:
        raise HTTPException(status_code=503, detail=f"Couchbase error: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to process message: {exc}") from exc


@router.post("/end")
async def end_conversation(req: EndRequest):
    from app.services.follow_up import generate_follow_up

    try:
        ts = now_iso()
        conversations_col = get_collection("conversations")
        leads_col = get_collection("leads")
        follow_ups_col = get_collection("follow_ups")

        lead_result = leads_col.get(req.lead_id)
        conversation_result = conversations_col.get(req.conversation_id)
        lead = Lead(**lead_result.content_as[dict])
        conversation = Conversation(**conversation_result.content_as[dict])

        if conversation.lead_id != req.lead_id:
            raise HTTPException(
                status_code=400,
                detail="Conversation does not belong to the specified lead",
            )

        extracted = await extract_lead_profile(conversation.transcript)
        summary = await generate_conversation_summary(conversation.transcript)

        objections = extracted.get("objections", [])
        buying_signals = extracted.get("buying_signals", [])
        conversation.summary = summary
        conversation.objections = objections if isinstance(objections, list) else []
        conversation.buying_signals = buying_signals if isinstance(buying_signals, list) else []
        conversation.updated_at = ts

        buying_intent = extracted.get("buying_intent")
        if buying_intent:
            lead.buying_intent = buying_intent
        lead.conversation_summary = summary
        lead.objections = conversation.objections
        lead.buying_signals = conversation.buying_signals
        lead.status = "qualified"
        lead.updated_at = ts

        follow_up_data = await generate_follow_up(lead)
        follow_up_id = f"followup::{uuid.uuid4()}"
        follow_up_doc = {
            "type": "follow_up",
            "lead_id": req.lead_id,
            "subject": follow_up_data["subject"],
            "body": follow_up_data["body"],
            "status": "draft",
            "created_at": ts,
        }

        leads_col.replace(req.lead_id, lead.model_dump())
        conversations_col.replace(req.conversation_id, conversation.model_dump())
        follow_ups_col.insert(follow_up_id, follow_up_doc)

        conversation_payload = conversation.model_dump()
        conversation_payload["id"] = req.conversation_id
        follow_up_payload = dict(follow_up_doc)
        follow_up_payload["id"] = follow_up_id

        return {
            "lead": lead.model_dump(),
            "conversation": conversation_payload,
            "follow_up": follow_up_payload,
            "follow_up_id": follow_up_id,
        }
    except DocumentNotFoundException:
        raise HTTPException(status_code=404, detail="Lead or conversation not found")
    except CouchbaseException as exc:
        raise HTTPException(status_code=503, detail=f"Couchbase error: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to end conversation: {exc}") from exc
