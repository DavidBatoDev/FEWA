import re
import time
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
from agora_agent.agentkit.token import generate_convo_ai_token
from agora_token_builder import RtcTokenBuilder
from agora_token_builder.RtcTokenBuilder import Role_Publisher, Role_Subscriber
from couchbase.exceptions import CouchbaseException, DocumentNotFoundException
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.db.couchbase import get_active_flow, get_collection
from app.models.conversation import Conversation
from app.models.lead import Lead
from app.services.prompt_registry import get_system_prompt
from app.services.sales_workflow import append_turn_and_refresh_sales_state, create_lead_and_conversation

router = APIRouter(prefix="/agora", tags=["agora"])

DEFAULT_TTL_SECONDS = 3600
MAX_TTL_SECONDS = 86400
CHANNEL_NAME_PATTERN = re.compile(r"^[A-Za-z0-9_.-]{1,64}$")
THINK_LISTEN_ACTIONS = {"inject", "interrupt", "ignore"}
THINK_STATE_ACTIONS = {"interrupt", "ignore"}
SPEAK_PRIORITIES = {"INTERRUPT", "APPEND", "IGNORE"}

ROLE_MAP = {
    "publisher": Role_Publisher,
    "subscriber": Role_Subscriber,
}


class TokenRequest(BaseModel):
    channel_name: str
    uid: int = 0
    role: str = "publisher"
    ttl_seconds: int = DEFAULT_TTL_SECONDS


class ConvoStartRequest(BaseModel):
    channel_name: str = "workflow-ph-cae"
    user_uid: str = "1002"
    agent_uid: str = "1001"
    agent_name: str | None = None
    preset: str | None = None
    pipeline_id: str | None = None
    tts_voice: str | None = None
    audio_scenario: str | None = None
    token_ttl_seconds: int = DEFAULT_TTL_SECONDS
    knowledge: str | None = None
    flow: str | None = None


class ConvoUserTokenRequest(BaseModel):
    channel_name: str = "workflow-ph-cae"
    user_uid: str = "1002"
    token_ttl_seconds: int = DEFAULT_TTL_SECONDS


class CaeAgentRequest(BaseModel):
    agent_id: str
    channel_name: str = "workflow-ph-cae"
    agent_uid: str = "1001"
    token_ttl_seconds: int = DEFAULT_TTL_SECONDS


class CaeTurnsRequest(CaeAgentRequest):
    page_index: int = 1
    page_size: int = 50


class CaeUpdateRequest(CaeAgentRequest):
    properties: dict[str, Any] | None = None


class CaeThinkRequest(CaeAgentRequest):
    text: str
    on_listening_action: str | None = None
    on_thinking_action: str | None = None
    on_speaking_action: str | None = None
    interruptable: bool | None = None
    metadata: dict[str, Any] | None = None


class CaeSpeakRequest(CaeAgentRequest):
    text: str
    priority: str | None = None
    interruptable: bool | None = None


class ConvoMemorySaveRequest(CaeAgentRequest):
    user_uid: str = "1002"


class ConvoMemoryInjectRequest(CaeAgentRequest):
    user_uid: str = "1002"
    system_messages: list[dict[str, str]] | None = None


class ConvoTranscriptUpsertRequest(BaseModel):
    lead_id: str
    conversation_id: str
    agent_id: str
    channel_name: str = "workflow-ph-cae"
    agent_uid: str = "1001"
    user_uid: str = "1002"
    role: str
    text: str
    turn_id: int | str
    is_final: bool = True
    publisher_uid: str | None = None
    timestamp: str | None = None


def _require_token_issuer_auth() -> None:
    # Hook for future endpoint auth (API key/JWT).
    return None


def _require_agora_credentials() -> None:
    if not settings.agora_app_id or not settings.agora_app_certificate:
        raise HTTPException(
            status_code=500,
            detail="Missing Agora credentials. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE.",
        )


def _validate_channel_name(channel_name: str) -> str:
    normalized = channel_name.strip()
    if not normalized:
        raise HTTPException(status_code=400, detail="channel_name is required")
    if not CHANNEL_NAME_PATTERN.fullmatch(normalized):
        raise HTTPException(
            status_code=400,
            detail="channel_name must match ^[A-Za-z0-9_.-]{1,64}$",
        )
    return normalized


def _validate_uid_string(uid: str, field_name: str) -> str:
    normalized = uid.strip()
    if not re.fullmatch(r"^[0-9]{1,18}$", normalized):
        raise HTTPException(status_code=400, detail=f"{field_name} must be a numeric string UID")
    return normalized


def _validate_ttl(ttl_seconds: int, field_name: str = "ttl_seconds") -> None:
    if ttl_seconds < 60 or ttl_seconds > MAX_TTL_SECONDS:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must be between 60 and {MAX_TTL_SECONDS}",
        )


def _build_convo_token(channel_name: str, account: str, ttl_seconds: int) -> str:
    return generate_convo_ai_token(
        settings.agora_app_id,
        settings.agora_app_certificate,
        channel_name,
        account,
        token_expire=ttl_seconds,
        privilege_expire=ttl_seconds,
    )


class CaeHttpClient:
    def __init__(self, app_id: str, base_url: str):
        self._app_id = app_id
        self._base_url = base_url.rstrip("/")

    async def request(
        self,
        method: str,
        path: str,
        token: str,
        *,
        json_body: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
        allow_empty_body: bool = False,
    ) -> dict[str, Any]:
        url = f"{self._base_url}/api/conversational-ai-agent/v2/projects/{self._app_id}{path}"
        headers = {
            "Authorization": f"agora token={token}",
        }
        if json_body is not None:
            headers["Content-Type"] = "application/json"

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.request(
                method=method,
                url=url,
                headers=headers,
                json=json_body,
                params=params,
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail={
                    "message": f"CAE upstream call failed: {method.upper()} {path}",
                    "status_code": response.status_code,
                    "body": response.text,
                },
            )

        if not response.text:
            return {} if allow_empty_body else {}

        try:
            return response.json()
        except ValueError:
            return {"raw_text": response.text}


def _cae_client() -> CaeHttpClient:
    return CaeHttpClient(
        app_id=settings.agora_app_id,
        base_url=settings.agora_convo_api_base,
    )


def _validate_agent_context(req: CaeAgentRequest) -> tuple[str, str, str]:
    channel_name = _validate_channel_name(req.channel_name)
    agent_uid = _validate_uid_string(req.agent_uid, "agent_uid")
    agent_id = req.agent_id.strip()
    if not agent_id:
        raise HTTPException(status_code=400, detail="agent_id is required")
    _validate_ttl(req.token_ttl_seconds, "token_ttl_seconds")
    return channel_name, agent_uid, agent_id


def _build_join_properties(req: ConvoStartRequest, agent_token: str, user_uid: str, agent_uid: str) -> dict[str, Any]:
    interruption = {
        "enable": True,
        "mode": "start_of_speech",
        "disabled_config": {
            "strategy": "append",
        },
    }
    turn_detection = {
        "mode": "default",
        "config": {
            "speech_threshold": 0.5,
            "start_of_speech": {
                "mode": "vad",
                "vad_config": {
                    "interrupt_duration_ms": 220,
                    "speaking_interrupt_duration_ms": 260,
                    "prefix_padding_ms": 800,
                },
            },
            "end_of_speech": {
                "mode": "vad",
                "vad_config": {
                    "silence_duration_ms": 1000,
                },
            },
        },
    }

    audio_scenario = (req.audio_scenario or settings.agora_convo_default_audio_scenario or "aiserver").strip()
    if audio_scenario not in {"default", "chorus", "aiserver"}:
        raise HTTPException(
            status_code=400,
            detail="audio_scenario must be one of: default, chorus, aiserver",
        )

    system_prompt = get_system_prompt(req.flow or get_active_flow())
    
    system_messages = [
        {"role": "system", "content": system_prompt}
    ]
    
    if req.knowledge:
        system_messages.append({
            "role": "system", 
            "content": f"The following is additional business context, product catalogs, or sales guidelines for this campaign:\n\n{req.knowledge}"
        })

    return {
        "channel": _validate_channel_name(req.channel_name),
        "token": agent_token,
        "agent_rtc_uid": agent_uid,
        "remote_rtc_uids": [user_uid],
        "enable_string_uid": False,
        "idle_timeout": settings.agora_convo_default_idle_timeout,
        "turn_detection": turn_detection,
        "interruption": interruption,
        "advanced_features": {
            "enable_rtm": True,
        },
        "parameters": {
            "data_channel": "rtm",
            "audio_scenario": audio_scenario,
            "enable_metrics": True,
            "enable_error_message": True,
        },
        "tts": {
            "params": {
                "voice": (req.tts_voice or settings.agora_convo_default_tts_voice),
            }
        },
        "llm": {
            "system_messages": system_messages,
        },
    }


async def _join_agent(req: ConvoStartRequest) -> dict[str, Any]:
    _require_agora_credentials()

    channel_name = _validate_channel_name(req.channel_name)
    user_uid = _validate_uid_string(req.user_uid, "user_uid")
    agent_uid = _validate_uid_string(req.agent_uid, "agent_uid")
    _validate_ttl(req.token_ttl_seconds, "token_ttl_seconds")

    agent_name = (req.agent_name or f"fewa-agent-{uuid.uuid4().hex[:8]}").strip()
    if not agent_name:
        raise HTTPException(status_code=400, detail="agent_name cannot be empty")

    agent_token = _build_convo_token(channel_name, agent_uid, req.token_ttl_seconds)
    user_token = _build_convo_token(channel_name, user_uid, req.token_ttl_seconds)

    payload: dict[str, Any] = {
        "name": agent_name,
        "properties": _build_join_properties(req, agent_token, user_uid, agent_uid),
    }

    effective_pipeline_id = (req.pipeline_id or settings.agora_convo_default_pipeline_id).strip()
    if effective_pipeline_id:
        payload["pipeline_id"] = effective_pipeline_id
    else:
        payload["preset"] = (req.preset or settings.agora_convo_default_preset)

    data = await _cae_client().request(
        method="POST",
        path="/join",
        token=agent_token,
        json_body=payload,
    )

    session_context = {
        "agent_id": data.get("agent_id", ""),
        "channel_name": channel_name,
        "agent_uid": agent_uid,
        "user_uid": user_uid,
    }
    try:
        lead_id, conversation_id, _, _ = create_lead_and_conversation(session_context=session_context)
    except CouchbaseException as exc:
        raise HTTPException(status_code=503, detail=f"Couchbase error: {exc}") from exc

    return {
        "agent_id": data.get("agent_id", ""),
        "agent_name": agent_name,
        "agent_uid": agent_uid,
        "user_uid": user_uid,
        "channel_name": channel_name,
        "lead_id": lead_id,
        "conversation_id": conversation_id,
        "user_token": user_token,
        "status": data.get("status", ""),
        "raw": data,
    }


async def _leave_agent(req: CaeAgentRequest) -> dict[str, Any]:
    _require_agora_credentials()
    channel_name, agent_uid, agent_id = _validate_agent_context(req)
    token = _build_convo_token(channel_name, agent_uid, req.token_ttl_seconds)
    data = await _cae_client().request(
        method="POST",
        path=f"/agents/{agent_id}/leave",
        token=token,
        allow_empty_body=True,
    )
    return {"ok": True, "agent_id": agent_id, "raw": data}


async def _interrupt_agent(req: CaeAgentRequest) -> dict[str, Any]:
    _require_agora_credentials()
    channel_name, agent_uid, agent_id = _validate_agent_context(req)
    token = _build_convo_token(channel_name, agent_uid, req.token_ttl_seconds)
    data = await _cae_client().request(
        method="POST",
        path=f"/agents/{agent_id}/interrupt",
        token=token,
        json_body={},
    )
    if not data:
        return {"ok": True, "agent_id": agent_id}
    return data


async def _history_agent(req: CaeAgentRequest) -> dict[str, Any]:
    _require_agora_credentials()
    channel_name, agent_uid, agent_id = _validate_agent_context(req)
    token = _build_convo_token(channel_name, agent_uid, req.token_ttl_seconds)
    data = await _cae_client().request(
        method="GET",
        path=f"/agents/{agent_id}/history",
        token=token,
    )
    contents = data.get("contents") if isinstance(data, dict) else []
    normalized_contents = contents if isinstance(contents, list) else []
    return {
        "agent_id": data.get("agent_id", agent_id),
        "status": data.get("status", ""),
        "start_ts": data.get("start_ts"),
        "contents": normalized_contents,
        "message_count": len(normalized_contents),
        "raw": data,
    }


async def _update_agent(req: CaeUpdateRequest) -> dict[str, Any]:
    _require_agora_credentials()
    channel_name, agent_uid, agent_id = _validate_agent_context(req)
    token = _build_convo_token(channel_name, agent_uid, req.token_ttl_seconds)
    payload: dict[str, Any] = {}
    if req.properties is not None:
        if not isinstance(req.properties, dict):
            raise HTTPException(status_code=400, detail="properties must be an object")
        payload["properties"] = req.properties
    return await _cae_client().request(
        method="POST",
        path=f"/agents/{agent_id}/update",
        token=token,
        json_body=payload,
    )


async def _think_agent(req: CaeThinkRequest) -> dict[str, Any]:
    _require_agora_credentials()
    channel_name, agent_uid, agent_id = _validate_agent_context(req)
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    if req.on_listening_action and req.on_listening_action not in THINK_LISTEN_ACTIONS:
        raise HTTPException(
            status_code=400,
            detail="on_listening_action must be one of: inject, interrupt, ignore",
        )
    if req.on_thinking_action and req.on_thinking_action not in THINK_STATE_ACTIONS:
        raise HTTPException(
            status_code=400,
            detail="on_thinking_action must be one of: interrupt, ignore",
        )
    if req.on_speaking_action and req.on_speaking_action not in THINK_STATE_ACTIONS:
        raise HTTPException(
            status_code=400,
            detail="on_speaking_action must be one of: interrupt, ignore",
        )
    if req.metadata is not None and not isinstance(req.metadata, dict):
        raise HTTPException(status_code=400, detail="metadata must be an object")

    payload: dict[str, Any] = {"text": text}
    if req.on_listening_action is not None:
        payload["on_listening_action"] = req.on_listening_action
    if req.on_thinking_action is not None:
        payload["on_thinking_action"] = req.on_thinking_action
    if req.on_speaking_action is not None:
        payload["on_speaking_action"] = req.on_speaking_action
    if req.interruptable is not None:
        payload["interruptable"] = req.interruptable
    if req.metadata is not None:
        payload["metadata"] = req.metadata

    token = _build_convo_token(channel_name, agent_uid, req.token_ttl_seconds)
    return await _cae_client().request(
        method="POST",
        path=f"/agents/{agent_id}/think",
        token=token,
        json_body=payload,
    )


async def _speak_agent(req: CaeSpeakRequest) -> dict[str, Any]:
    _require_agora_credentials()
    channel_name, agent_uid, agent_id = _validate_agent_context(req)
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    payload: dict[str, Any] = {"text": text}
    if req.priority is not None:
        priority = req.priority.strip().upper()
        if priority not in SPEAK_PRIORITIES:
            raise HTTPException(
                status_code=400,
                detail="priority must be one of: INTERRUPT, APPEND, IGNORE",
            )
        payload["priority"] = priority
    if req.interruptable is not None:
        payload["interruptable"] = req.interruptable

    token = _build_convo_token(channel_name, agent_uid, req.token_ttl_seconds)
    return await _cae_client().request(
        method="POST",
        path=f"/agents/{agent_id}/speak",
        token=token,
        json_body=payload,
    )


async def _query_turns(req: CaeTurnsRequest) -> dict[str, Any]:
    _require_agora_credentials()
    channel_name, agent_uid, agent_id = _validate_agent_context(req)
    if req.page_index < 1:
        raise HTTPException(status_code=400, detail="page_index must be >= 1")
    if req.page_size < 10 or req.page_size > 200:
        raise HTTPException(status_code=400, detail="page_size must be between 10 and 200")

    token = _build_convo_token(channel_name, agent_uid, req.token_ttl_seconds)
    return await _cae_client().request(
        method="GET",
        path=f"/agents/{agent_id}/turns",
        token=token,
        params={
            "page_index": req.page_index,
            "page_size": req.page_size,
        },
    )


async def _query_agent_status(req: CaeAgentRequest) -> dict[str, Any]:
    _require_agora_credentials()
    channel_name, agent_uid, agent_id = _validate_agent_context(req)
    token = _build_convo_token(channel_name, agent_uid, req.token_ttl_seconds)
    return await _cae_client().request(
        method="GET",
        path=f"/agents/{agent_id}",
        token=token,
    )


def _build_memory_summary(contents: list[dict[str, Any]]) -> str:
    recent = [c for c in contents if isinstance(c, dict) and c.get("content")][-8:]
    if not recent:
        return "No prior conversation context available."

    lines: list[str] = []
    for entry in recent:
        role = str(entry.get("role", "unknown")).lower()
        content = str(entry.get("content", "")).strip()
        if not content:
            continue
        if len(content) > 160:
            content = f"{content[:157]}..."
        prefix = "User" if role == "user" else "Assistant" if role == "assistant" else "System"
        lines.append(f"{prefix}: {content}")

    if not lines:
        return "No prior conversation context available."

    return "Previous conversation highlights:\n" + "\n".join(lines)


def _normalize_system_messages(messages: list[dict[str, str]]) -> list[dict[str, str]]:
    normalized: list[dict[str, str]] = []
    for idx, msg in enumerate(messages):
        if not isinstance(msg, dict):
            raise HTTPException(status_code=400, detail=f"system_messages[{idx}] must be an object")
        role = str(msg.get("role", "")).strip().lower()
        content = str(msg.get("content", "")).strip()
        if role != "system":
            raise HTTPException(status_code=400, detail=f"system_messages[{idx}].role must be 'system'")
        if not content:
            raise HTTPException(status_code=400, detail=f"system_messages[{idx}].content is required")
        normalized.append({"role": "system", "content": content})

    if not normalized:
        raise HTTPException(status_code=400, detail="system_messages cannot be empty")

    return normalized


def _normalize_transcript_role(role: str) -> str:
    normalized = role.strip().lower()
    if normalized not in {"user", "assistant"}:
        raise HTTPException(status_code=400, detail="role must be either 'user' or 'assistant'")
    return normalized


def _normalize_turn_id(turn_id: int | str) -> str:
    turn_text = str(turn_id).strip()
    if not turn_text:
        raise HTTPException(status_code=400, detail="turn_id is required")
    return turn_text


def _normalize_optional_publisher_uid(publisher_uid: str | None) -> str:
    if not publisher_uid:
        return ""
    return publisher_uid.strip()


def _build_turn_key(role: str, turn_id: str, publisher_uid: str) -> str:
    if publisher_uid:
        return f"{role}:{publisher_uid}:{turn_id}"
    return f"{role}:{turn_id}"


def _assert_matching_session_context(conversation: Conversation, req: ConvoTranscriptUpsertRequest) -> None:
    if not conversation.session_context:
        return

    expected = {
        "agent_id": req.agent_id.strip(),
        "channel_name": _validate_channel_name(req.channel_name),
        "agent_uid": _validate_uid_string(req.agent_uid, "agent_uid"),
        "user_uid": _validate_uid_string(req.user_uid, "user_uid"),
    }

    for key, expected_value in expected.items():
        actual = str(conversation.session_context.get(key, "")).strip()
        if actual != expected_value:
            raise HTTPException(status_code=400, detail=f"Session context mismatch for {key}")


def _build_sales_snapshot(
    lead: Lead,
    conversation: Conversation,
    *,
    lead_id: str,
    conversation_id: str,
    deduped: bool = False,
) -> dict[str, Any]:
    return {
        "accepted": not deduped,
        "deduped": deduped,
        "lead_id": lead_id,
        "conversation_id": conversation_id,
        "lead_profile": lead.model_dump(),
        "lead_score": lead.lead_score,
        "lead_temperature": lead.lead_temperature,
        "recommended_offer": lead.recommended_offer,
        "objections": list(conversation.objections),
        "buying_signals": list(conversation.buying_signals),
        "next_best_action": lead.next_best_action,
        "conversation_summary": lead.conversation_summary,
    }


@router.post("/token")
async def generate_token(req: TokenRequest):
    _require_token_issuer_auth()
    _require_agora_credentials()

    channel_name = _validate_channel_name(req.channel_name)
    normalized_role = req.role.lower().strip()
    if normalized_role not in ROLE_MAP:
        raise HTTPException(status_code=400, detail="role must be one of: publisher, subscriber")
    if req.uid < 0:
        raise HTTPException(status_code=400, detail="uid must be greater than or equal to 0")
    _validate_ttl(req.ttl_seconds, "ttl_seconds")

    issued_at = int(time.time())
    expires_at = issued_at + req.ttl_seconds

    token = RtcTokenBuilder.buildTokenWithUid(
        settings.agora_app_id,
        settings.agora_app_certificate,
        channel_name,
        req.uid,
        ROLE_MAP[normalized_role],
        expires_at,
    )

    return {
        "token": token,
        "channel_name": channel_name,
        "uid": req.uid,
        "role": normalized_role,
        "issued_at": issued_at,
        "expires_at": expires_at,
    }


@router.post("/cae/join")
async def cae_join(req: ConvoStartRequest):
    _require_token_issuer_auth()
    return await _join_agent(req)


@router.post("/cae/leave")
async def cae_leave(req: CaeAgentRequest):
    _require_token_issuer_auth()
    return await _leave_agent(req)


@router.post("/cae/interrupt")
async def cae_interrupt(req: CaeAgentRequest):
    _require_token_issuer_auth()
    return await _interrupt_agent(req)


@router.post("/cae/update")
async def cae_update(req: CaeUpdateRequest):
    _require_token_issuer_auth()
    return await _update_agent(req)


@router.post("/cae/think")
async def cae_think(req: CaeThinkRequest):
    _require_token_issuer_auth()
    return await _think_agent(req)


@router.post("/cae/speak")
async def cae_speak(req: CaeSpeakRequest):
    _require_token_issuer_auth()
    return await _speak_agent(req)


@router.post("/cae/query")
async def cae_query(req: CaeAgentRequest):
    _require_token_issuer_auth()
    return await _query_agent_status(req)


@router.post("/cae/history")
async def cae_history(req: CaeAgentRequest):
    _require_token_issuer_auth()
    return await _history_agent(req)


@router.post("/cae/turns")
async def cae_turns(req: CaeTurnsRequest):
    _require_token_issuer_auth()
    return await _query_turns(req)


@router.post("/cae/status")
async def cae_status(req: CaeAgentRequest):
    _require_token_issuer_auth()
    return await _query_agent_status(req)


# Compatibility wrappers for existing frontend contract.
@router.post("/convo/start")
async def start_conversational_agent(req: ConvoStartRequest):
    _require_token_issuer_auth()
    return await _join_agent(req)


@router.post("/convo/user-token")
async def create_convo_user_token(req: ConvoUserTokenRequest):
    _require_token_issuer_auth()
    _require_agora_credentials()

    channel_name = _validate_channel_name(req.channel_name)
    user_uid = _validate_uid_string(req.user_uid, "user_uid")
    _validate_ttl(req.token_ttl_seconds, "token_ttl_seconds")

    user_token = _build_convo_token(channel_name, user_uid, req.token_ttl_seconds)
    issued_at = int(time.time())

    return {
        "channel_name": channel_name,
        "user_uid": user_uid,
        "user_token": user_token,
        "issued_at": issued_at,
        "expires_at": issued_at + req.token_ttl_seconds,
    }


@router.post("/convo/stop")
async def stop_conversational_agent(req: CaeAgentRequest):
    _require_token_issuer_auth()
    data = await _leave_agent(req)
    return {"ok": True, "agent_id": data["agent_id"]}


@router.post("/convo/interrupt")
async def interrupt_conversational_agent(req: CaeAgentRequest):
    _require_token_issuer_auth()
    return await _interrupt_agent(req)


@router.post("/convo/history")
async def get_conversational_agent_history(req: CaeAgentRequest):
    _require_token_issuer_auth()
    history = await _history_agent(req)
    return {
        "agent_id": history.get("agent_id", req.agent_id),
        "status": history.get("status", ""),
        "start_ts": history.get("start_ts"),
        "contents": history.get("contents", []),
        "message_count": history.get("message_count", 0),
    }


@router.post("/convo/query")
async def get_conversation_turns(req: CaeTurnsRequest):
    _require_token_issuer_auth()
    return await _query_turns(req)


@router.post("/convo/speak")
async def speak_conversational_agent(req: CaeSpeakRequest):
    _require_token_issuer_auth()
    return await _speak_agent(req)


@router.post("/convo/think")
async def think_conversational_agent(req: CaeThinkRequest):
    _require_token_issuer_auth()
    return await _think_agent(req)


@router.post("/convo/update")
async def update_conversational_agent(req: CaeUpdateRequest):
    _require_token_issuer_auth()
    return await _update_agent(req)


@router.post("/convo/transcript/upsert")
async def upsert_conversation_transcript(req: ConvoTranscriptUpsertRequest):
    _require_token_issuer_auth()

    lead_id = req.lead_id.strip()
    conversation_id = req.conversation_id.strip()
    if not lead_id:
        raise HTTPException(status_code=400, detail="lead_id is required")
    if not conversation_id:
        raise HTTPException(status_code=400, detail="conversation_id is required")
    if not req.agent_id.strip():
        raise HTTPException(status_code=400, detail="agent_id is required")

    # Validate session fields early for clearer request errors.
    _validate_channel_name(req.channel_name)
    _validate_uid_string(req.agent_uid, "agent_uid")
    _validate_uid_string(req.user_uid, "user_uid")

    role = _normalize_transcript_role(req.role)
    turn_id = _normalize_turn_id(req.turn_id)
    publisher_uid = _normalize_optional_publisher_uid(req.publisher_uid)
    turn_key = _build_turn_key(role, turn_id, publisher_uid)

    leads_col = get_collection("leads")
    conversations_col = get_collection("conversations")

    try:
        lead_doc = leads_col.get(lead_id).content_as[dict]
        conversation_doc = conversations_col.get(conversation_id).content_as[dict]
        lead = Lead(**lead_doc)
        conversation = Conversation(**conversation_doc)
    except DocumentNotFoundException:
        raise HTTPException(status_code=404, detail="Lead or conversation not found")
    except CouchbaseException as exc:
        raise HTTPException(status_code=503, detail=f"Couchbase error: {exc}") from exc

    if conversation.lead_id != lead_id:
        raise HTTPException(status_code=400, detail="Conversation does not belong to the specified lead")
    _assert_matching_session_context(conversation, req)

    if not req.is_final:
        snapshot = _build_sales_snapshot(
            lead,
            conversation,
            lead_id=lead_id,
            conversation_id=conversation_id,
            deduped=False,
        )
        snapshot["accepted"] = False
        snapshot["reason"] = "ignored_non_final_turn"
        return snapshot

    if turn_key in conversation.processed_turn_keys:
        snapshot = _build_sales_snapshot(
            lead,
            conversation,
            lead_id=lead_id,
            conversation_id=conversation_id,
            deduped=True,
        )
        return snapshot

    try:
        lead, conversation, accepted = await append_turn_and_refresh_sales_state(
            lead=lead,
            conversation=conversation,
            role=role,
            message=req.text,
            timestamp=req.timestamp,
            turn_key=turn_key,
            mark_in_progress=True,
        )
        if accepted:
            leads_col.replace(lead_id, lead.model_dump())
            conversations_col.replace(conversation_id, conversation.model_dump())
    except CouchbaseException as exc:
        raise HTTPException(status_code=503, detail=f"Couchbase error: {exc}") from exc

    deduped = not accepted
    snapshot = _build_sales_snapshot(
        lead,
        conversation,
        lead_id=lead_id,
        conversation_id=conversation_id,
        deduped=deduped,
    )
    if not accepted:
        snapshot["accepted"] = False
        snapshot["reason"] = "empty_text"
    return snapshot


@router.post("/convo/memory/save")
async def save_conversational_memory(req: ConvoMemorySaveRequest):
    _require_token_issuer_auth()
    _require_agora_credentials()

    channel_name = _validate_channel_name(req.channel_name)
    agent_uid = _validate_uid_string(req.agent_uid, "agent_uid")
    user_uid = _validate_uid_string(req.user_uid, "user_uid")
    agent_id = req.agent_id.strip()
    if not agent_id:
        raise HTTPException(status_code=400, detail="agent_id is required")
    _validate_ttl(req.token_ttl_seconds, "token_ttl_seconds")

    history = await _history_agent(req)
    raw_contents = history.get("contents") or []
    contents = raw_contents if isinstance(raw_contents, list) else []
    summary = _build_memory_summary(contents)
    captured_at = datetime.now(timezone.utc).isoformat()

    memory_doc = {
        "type": "convo_memory",
        "agent_id": agent_id,
        "channel_name": channel_name,
        "agent_uid": agent_uid,
        "user_uid": user_uid,
        "captured_at": captured_at,
        "summary": summary,
        "history": {
            "status": history.get("status"),
            "start_ts": history.get("start_ts"),
            "contents": contents,
        },
        "message_count": len(contents),
        "source": "agora_cae_history",
    }

    latest_key = f"convo_memory_latest::{channel_name}::{user_uid}"
    snapshot_key = f"convo_memory_snapshot::{agent_id}::{int(time.time())}"

    try:
        conversations_col = get_collection("conversations")
        conversations_col.upsert(latest_key, memory_doc)
        conversations_col.upsert(snapshot_key, memory_doc)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Failed to persist memory to Couchbase: {exc}") from exc

    return {
        "ok": True,
        "agent_id": agent_id,
        "channel_name": channel_name,
        "user_uid": user_uid,
        "message_count": len(contents),
        "summary": summary,
        "latest_key": latest_key,
        "snapshot_key": snapshot_key,
    }


@router.post("/convo/memory/inject")
async def inject_conversational_memory(req: ConvoMemoryInjectRequest):
    _require_token_issuer_auth()
    _require_agora_credentials()

    channel_name = _validate_channel_name(req.channel_name)
    _validate_uid_string(req.agent_uid, "agent_uid")
    user_uid = _validate_uid_string(req.user_uid, "user_uid")
    if not req.agent_id.strip():
        raise HTTPException(status_code=400, detail="agent_id is required")

    system_messages = req.system_messages
    loaded_from_key = ""
    if not system_messages:
        latest_key = f"convo_memory_latest::{channel_name}::{user_uid}"
        try:
            conversations_col = get_collection("conversations")
            memory_doc = conversations_col.get(latest_key).content_as[dict]
        except Exception as exc:
            raise HTTPException(status_code=404, detail=f"No saved memory found for {latest_key}: {exc}") from exc

        summary = str(memory_doc.get("summary", "")).strip()
        if not summary:
            raise HTTPException(status_code=400, detail="Saved memory summary is empty; cannot inject")

        system_messages = [
            {"role": "system", "content": "Use the following prior conversation context when responding."},
            {"role": "system", "content": summary},
        ]
        loaded_from_key = latest_key

    normalized_messages = _normalize_system_messages(system_messages)
    update_res = await _update_agent(
        CaeUpdateRequest(
            agent_id=req.agent_id,
            channel_name=req.channel_name,
            agent_uid=req.agent_uid,
            token_ttl_seconds=req.token_ttl_seconds,
            properties={
                "llm": {
                    "system_messages": normalized_messages,
                }
            },
        )
    )

    return {
        "ok": True,
        "agent_id": req.agent_id,
        "system_messages_count": len(normalized_messages),
        "loaded_from_key": loaded_from_key,
        "raw": update_res,
    }
