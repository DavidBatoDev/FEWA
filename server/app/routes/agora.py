import json
import logging
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

import httpx
from agora_agent.agentkit.token import generate_convo_ai_token
from agora_token_builder import RtcTokenBuilder
from agora_token_builder.RtcTokenBuilder import Role_Publisher, Role_Subscriber
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.db.couchbase import get_collection
from app.models.lead import Lead
from app.models.customer import Customer
from app.models.conversation import Conversation
from app.services.ai_agent import SYSTEM_PROMPT
from app.services.commerce_agent import MAYA_SYSTEM_PROMPT
from app.services.tool_executor import register_session, unregister_session
from app.services.commerce_tool_executor import (
    register_session as register_commerce_session,
    unregister_session as unregister_commerce_session,
)

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
    channel_name: str = "fflow-ph-cae"
    user_uid: str = "1002"
    agent_uid: str = "1001"
    agent_name: str | None = None
    preset: str | None = None
    pipeline_id: str | None = None
    tts_voice: str | None = None
    tts_speed: float | None = None
    audio_scenario: str | None = None
    token_ttl_seconds: int = DEFAULT_TTL_SECONDS
    # FFlow PH extension — selects which agent persona + tool set + custom LLM endpoint
    # the Agora session attaches to. "sales" (default, Faye/B2B) keeps existing behavior.
    agent_type: str = "sales"


class ConvoUserTokenRequest(BaseModel):
    channel_name: str = "fflow-ph-cae"
    user_uid: str = "1002"
    token_ttl_seconds: int = DEFAULT_TTL_SECONDS


class CaeAgentRequest(BaseModel):
    agent_id: str
    channel_name: str = "fflow-ph-cae"
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


def _agent_type(req: ConvoStartRequest) -> str:
    return "commerce" if (req.agent_type or "").lower() == "commerce" else "sales"


def _greeting_for(agent_type: str) -> str:
    if agent_type == "commerce":
        return (
            "Hi! I'm Maya, your shopping assistant from FFlow PH. "
            "I can help you find the perfect pair of shoes. "
            "Before we start, may I know your name?"
        )
    return "Hi! I'm Faye, a business consultant from FFlow PH specializing in logistics and marketing. Before we dive in, may I know your name?"


def _system_prompt_for(agent_type: str) -> str:
    return MAYA_SYSTEM_PROMPT if agent_type == "commerce" else SYSTEM_PROMPT


def _llm_url_for(agent_type: str, channel_name: str) -> str:
    base = settings.backend_public_url.rstrip("/")
    if agent_type == "commerce":
        return f"{base}/commerce/chat/completions?channel={channel_name}"
    return f"{base}/chat/completions?channel={channel_name}"


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

    props = {
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
                "voice": req.tts_voice or ("alloy" if _agent_type(req) == "commerce" else settings.agora_convo_default_tts_voice),
                "speed": max(0.25, min(4.0, req.tts_speed if req.tts_speed is not None else settings.agora_convo_default_tts_speed)),
            }
        },
        "llm": {
            **(
                {
                    "url": _llm_url_for(_agent_type(req), _validate_channel_name(req.channel_name)),
                    "api_key": settings.custom_llm_api_key or "no-key",
                    "greeting_message": _greeting_for(_agent_type(req)),
                }
                if settings.backend_public_url
                else {}
            ),
            "system_messages": [
                {"role": "system", "content": _system_prompt_for(_agent_type(req))}
            ],
        },
    }
    llm_block = props["llm"]
    logger.info(
        "JOIN PAYLOAD llm block: url=%r  api_key_set=%s",
        llm_block.get("url", "NOT SET"),
        bool(llm_block.get("api_key")),
    )
    logger.debug("Full join payload: %s", json.dumps(props, indent=2, default=str))
    return props


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
        # When using a custom LLM URL, only use TTS preset — the full OpenAI preset
        # includes its own LLM which conflicts with our custom llm.url and crashes the agent.
        if settings.backend_public_url:
            effective_preset = req.preset or "openai_tts_1"
        else:
            effective_preset = req.preset or settings.agora_convo_default_preset
        payload["preset"] = effective_preset
        logger.info("Agent preset: %r  (custom_llm=%s)", effective_preset, bool(settings.backend_public_url))

    data = await _cae_client().request(
        method="POST",
        path="/join",
        token=agent_token,
        json_body=payload,
    )
    logger.info(
        "Agora /join response: agent_id=%r  status=%r",
        data.get("agent_id"), data.get("status"),
    )

    return {
        "agent_id": data.get("agent_id", ""),
        "agent_name": agent_name,
        "agent_uid": agent_uid,
        "user_uid": user_uid,
        "channel_name": channel_name,
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
    data = await _join_agent(req)

    agent_type = _agent_type(req)
    channel_name = _validate_channel_name(req.channel_name)
    ts = datetime.now(timezone.utc).isoformat()
    conversation_id = f"conversation::{uuid.uuid4()}"

    if agent_type == "commerce":
        customer_id = f"customer::{uuid.uuid4()}"
        try:
            import time as _time
            customer = Customer(created_at=ts, updated_at=ts)
            conversation = Conversation(lead_id=customer_id, created_at=ts, updated_at=ts)
            for attempt in range(2):
                try:
                    get_collection("customers").insert(customer_id, customer.model_dump())
                    get_collection("conversations").insert(conversation_id, conversation.model_dump())
                    break
                except Exception as inner_exc:
                    if attempt == 0:
                        logger.warning("Couchbase commerce insert attempt 1 failed (%s), retrying…", inner_exc)
                        _time.sleep(0.5)
                    else:
                        raise
            data["customer_id"] = customer_id
            data["conversation_id"] = conversation_id
            data["agent_type"] = "commerce"
            logger.info(
                "Commerce session registered: channel=%r  customer_id=%r  conversation_id=%r",
                channel_name, customer_id, conversation_id,
            )
        except Exception as exc:
            logger.warning("Failed to create customer/conversation docs: %s", exc)

        register_commerce_session(channel_name, customer_id, conversation_id)
        return data

    # Default: B2B sales path
    lead_id = f"lead::{uuid.uuid4()}"
    try:
        import time as _time
        lead = Lead(created_at=ts, updated_at=ts)
        conversation = Conversation(lead_id=lead_id, created_at=ts, updated_at=ts)
        for attempt in range(2):
            try:
                get_collection("leads").insert(lead_id, lead.model_dump())
                get_collection("conversations").insert(conversation_id, conversation.model_dump())
                break
            except Exception as inner_exc:
                if attempt == 0:
                    logger.warning("Couchbase insert attempt 1 failed (%s), retrying…", inner_exc)
                    _time.sleep(0.5)
                else:
                    raise
        data["lead_id"] = lead_id
        data["conversation_id"] = conversation_id
        data["agent_type"] = "sales"
        logger.info(
            "Sales session registered: channel=%r  lead_id=%r  conversation_id=%r",
            channel_name, lead_id, conversation_id,
        )
    except Exception as exc:
        logger.warning("Failed to create lead/conversation docs: %s", exc)

    register_session(channel_name, lead_id, conversation_id)
    return data


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
    channel = _validate_channel_name(req.channel_name)
    # Unregister from both executors — only one will actually have an entry.
    unregister_session(channel)
    unregister_commerce_session(channel)
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
