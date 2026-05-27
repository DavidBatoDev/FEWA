import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from couchbase.exceptions import CouchbaseException, DocumentNotFoundException
from openai import AsyncOpenAI
from app.config import settings
from app.models.lead import Lead
from app.models.conversation import Conversation, TranscriptEntry
from app.services.ai_agent import get_agent_response, generate_conversation_summary
from app.services.agent_tools import (
    SALES_AGENT_TOOLS,
    TOOL_RUNTIME_INSTRUCTIONS,
    execute_agent_tool_calls,
)
from app.services.prompt_registry import get_system_prompt
from app.services.sales_workflow import (
    create_lead_and_conversation,
    now_iso,
    refresh_sales_state_from_transcript,
)
from app.db.couchbase import get_active_flow, get_collection

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

        if get_active_flow() == "b2c":
            greeting = (
                "Hi! I'm the Workflow PH Commerce Agent. "
                "I can help you find the right product and guide you through checkout. "
                "What kind of product are you looking for today?"
            )
        else:
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
        calls_col = get_collection("discovery_calls")

        conversation_result = conversations_col.get(req.conversation_id)
        conversation = Conversation(**conversation_result.content_as[dict])
        lead_result = leads_col.get(req.lead_id)
        lead = Lead(**lead_result.content_as[dict])

        if conversation.lead_id != req.lead_id:
            raise HTTPException(
                status_code=400,
                detail="Conversation does not belong to the specified lead",
            )

        user_entry = TranscriptEntry(role="user", message=req.message, timestamp=ts)
        conversation.transcript.append(user_entry)

        ai_response = ""
        tools_fired: list[dict] = []

        has_openai_key = bool(settings.openai_api_key and settings.openai_api_key.strip())
        if has_openai_key:
            client = AsyncOpenAI(api_key=settings.openai_api_key)
            active_flow = get_active_flow()
            system = get_system_prompt(active_flow)
            if req.language_mode == "Taglish":
                system += "\n\nSpeak in natural Taglish, a mix of Filipino and English common in the Philippines."

            messages: list[dict] = [{"role": "system", "content": system}]
            for entry in conversation.transcript:
                messages.append({"role": entry.role, "content": entry.message})

            if active_flow == "b2b":
                system += "\n\n" + TOOL_RUNTIME_INSTRUCTIONS
                messages[0] = {"role": "system", "content": system}
                first_response = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages,
                    tools=SALES_AGENT_TOOLS,
                    tool_choice="auto",
                    temperature=0.4,
                    max_tokens=300,
                )
            else:
                first_response = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messages,
                    temperature=0.7,
                    max_tokens=300,
                )
            first_msg = first_response.choices[0].message
            first_tool_calls = first_msg.tool_calls or []

            if active_flow == "b2b" and first_tool_calls:
                normalized_calls: list[dict] = []
                tool_calls_for_message: list[dict] = []
                for tc in first_tool_calls:
                    tc_id = (getattr(tc, "id", "") or "").strip() or f"tool_call_{uuid.uuid4().hex}"
                    fn = getattr(tc, "function", None)
                    fn_name = getattr(fn, "name", "") if fn else ""
                    fn_args = getattr(fn, "arguments", "{}") if fn else "{}"
                    normalized_calls.append(
                        {
                            "id": tc_id,
                            "name": fn_name,
                            "arguments": fn_args,
                        }
                    )
                    tool_calls_for_message.append(
                        {
                            "id": tc_id,
                            "type": "function",
                            "function": {
                                "name": fn_name,
                                "arguments": fn_args,
                            },
                        }
                    )

                tools_fired, tool_outputs_for_model = await execute_agent_tool_calls(
                    tool_calls=normalized_calls,
                    lead_id=req.lead_id,
                    conversation_id=req.conversation_id,
                    lead=lead,
                    conversation=conversation,
                    calls_col=calls_col,
                )

                tool_roundtrip_messages = list(messages)
                tool_roundtrip_messages.append(
                    {
                        "role": "assistant",
                        "content": first_msg.content or "",
                        "tool_calls": tool_calls_for_message,
                    }
                )
                for item in tool_outputs_for_model:
                    tool_roundtrip_messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": item["tool_call_id"],
                            "content": item["output"],
                        }
                    )
                final_response = await client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=tool_roundtrip_messages,
                    temperature=0.7,
                    max_tokens=300,
                )
                ai_response = final_response.choices[0].message.content or ""
            else:
                ai_response = first_msg.content or ""

        if not ai_response.strip():
            ai_response = await get_agent_response(conversation.transcript, req.language_mode)

        assistant_entry = TranscriptEntry(role="assistant", message=ai_response, timestamp=now_iso())
        conversation.transcript.append(assistant_entry)

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
            "tools_fired": tools_fired,
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
