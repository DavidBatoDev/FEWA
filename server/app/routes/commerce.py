"""
B2C Commerce Agent conversation routes — text/chat mode parallel to /agent.

POST /commerce/start    — creates customer + conversation, returns greeting
POST /commerce/message  — appends turn, runs the LLM, returns response + state
POST /commerce/end      — closes the conversation, generates a summary
"""
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from couchbase.exceptions import CouchbaseException, DocumentNotFoundException

from app.db.couchbase import get_collection
from app.models.conversation import Conversation, TranscriptEntry
from app.models.customer import Customer
from app.services.commerce_agent import generate_commerce_summary, get_commerce_response

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/commerce", tags=["commerce"])


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class StartRequest(BaseModel):
    store_name: str = ""


class MessageRequest(BaseModel):
    customer_id: str
    conversation_id: str
    message: str
    language_mode: str = "English"


class EndRequest(BaseModel):
    customer_id: str
    conversation_id: str


@router.post("/start")
async def start_conversation(req: StartRequest):
    try:
        ts = _now_iso()
        customer_id = f"customer::{uuid.uuid4()}"
        conversation_id = f"conversation::{uuid.uuid4()}"

        customer = Customer(created_at=ts, updated_at=ts)
        conversation = Conversation(lead_id=customer_id, created_at=ts, updated_at=ts)

        get_collection("customers").insert(customer_id, customer.model_dump())
        get_collection("conversations").insert(conversation_id, conversation.model_dump())

        greeting = (
            "Hi! I'm Maya, your shopping assistant from FFlow PH. "
            "I can help you find the perfect pair of shoes. "
            "Before we start, may I know your name?"
        )
        return {
            "customer_id": customer_id,
            "conversation_id": conversation_id,
            "greeting": greeting,
        }
    except CouchbaseException as exc:
        raise HTTPException(status_code=503, detail=f"Couchbase error: {exc}") from exc
    except Exception as exc:
        logger.exception("Failed to start commerce conversation")
        raise HTTPException(status_code=500, detail=f"Failed to start conversation: {exc}") from exc


@router.post("/message")
async def handle_message(req: MessageRequest):
    try:
        ts = _now_iso()
        conversations_col = get_collection("conversations")
        customers_col = get_collection("customers")

        conversation = Conversation(**conversations_col.get(req.conversation_id).content_as[dict])
        customer = Customer(**customers_col.get(req.customer_id).content_as[dict])

        if conversation.lead_id != req.customer_id:
            raise HTTPException(status_code=400, detail="Conversation does not belong to the specified customer")

        conversation.transcript.append(TranscriptEntry(role="user", message=req.message, timestamp=ts))

        ai_response = await get_commerce_response(conversation.transcript, req.language_mode)

        conversation.transcript.append(TranscriptEntry(role="assistant", message=ai_response, timestamp=_now_iso()))
        conversation.updated_at = _now_iso()
        conversations_col.replace(req.conversation_id, conversation.model_dump())

        customer.updated_at = _now_iso()
        customers_col.replace(req.customer_id, customer.model_dump())

        return {
            "response": ai_response,
            "customer_profile": customer.model_dump(),
        }
    except DocumentNotFoundException:
        raise HTTPException(status_code=404, detail="Customer or conversation not found")
    except CouchbaseException as exc:
        raise HTTPException(status_code=503, detail=f"Couchbase error: {exc}") from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to process commerce message")
        raise HTTPException(status_code=500, detail=f"Failed to process message: {exc}") from exc


@router.post("/end")
async def end_conversation(req: EndRequest):
    try:
        ts = _now_iso()
        conversations_col = get_collection("conversations")
        customers_col = get_collection("customers")

        conversation = Conversation(**conversations_col.get(req.conversation_id).content_as[dict])
        customer = Customer(**customers_col.get(req.customer_id).content_as[dict])

        if conversation.lead_id != req.customer_id:
            raise HTTPException(status_code=400, detail="Conversation does not belong to the specified customer")

        summary = await generate_commerce_summary(conversation.transcript)
        conversation.summary = summary
        conversation.updated_at = ts
        customer.conversation_summary = summary
        customer.updated_at = ts

        # Determine final status — abandoned if no order was ever placed
        if not customer.order_reference and customer.status not in ("checkout_ready",):
            customer.status = customer.status if customer.status in ("ordering", "verified") else "abandoned"

        conversations_col.replace(req.conversation_id, conversation.model_dump())
        customers_col.replace(req.customer_id, customer.model_dump())

        conv_payload = conversation.model_dump()
        conv_payload["id"] = req.conversation_id

        return {
            "customer": customer.model_dump(),
            "conversation": conv_payload,
        }
    except DocumentNotFoundException:
        raise HTTPException(status_code=404, detail="Customer or conversation not found")
    except CouchbaseException as exc:
        raise HTTPException(status_code=503, detail=f"Couchbase error: {exc}") from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to end commerce conversation")
        raise HTTPException(status_code=500, detail=f"Failed to end conversation: {exc}") from exc
