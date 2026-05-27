import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from couchbase.exceptions import CouchbaseException, DocumentNotFoundException
from app.models.lead import Lead
from app.models.conversation import Conversation, TranscriptEntry
from app.services.ai_agent import get_agent_response, generate_conversation_summary
from app.services.sales_workflow import (
    create_lead_and_conversation,
    now_iso,
    refresh_sales_state_from_transcript,
)
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


@router.post("/start")
async def start_conversation(req: StartRequest):
    try:
        lead_id, conversation_id, _, _ = create_lead_and_conversation(campaign_id=req.campaign_id)

        greeting = (
            "Hi! I'm the FFlow PH Sales Agent. "
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

        lead_result = leads_col.get(req.lead_id)
        lead = Lead(**lead_result.content_as[dict])
        if conversation.lead_id != req.lead_id:
            raise HTTPException(
                status_code=400,
                detail="Conversation does not belong to the specified lead",
            )

        lead, conversation = await refresh_sales_state_from_transcript(lead, conversation, mark_in_progress=True)

        leads_col.replace(req.lead_id, lead.model_dump())
        conversations_col.replace(req.conversation_id, conversation.model_dump())

        return {
            "response": ai_response,
            "lead_profile": lead.model_dump(),
            "lead_score": lead.lead_score,
            "lead_temperature": lead.lead_temperature,
            "score_breakdown": lead.score_breakdown,
            "recommended_offer": lead.recommended_offer,
            "objections": conversation.objections,
            "buying_signals": conversation.buying_signals,
            "next_best_action": lead.next_best_action,
        }
    except CouchbaseException as exc:
        raise HTTPException(status_code=503, detail=f"Couchbase error: {exc}") from exc
    except HTTPException as exc:
        raise exc
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

        lead, conversation = await refresh_sales_state_from_transcript(
            lead,
            conversation,
            mark_in_progress=False,
        )
        summary = await generate_conversation_summary(conversation.transcript)

        conversation.summary = summary
        conversation.updated_at = ts

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
    except HTTPException as exc:
        raise exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to end conversation: {exc}") from exc
