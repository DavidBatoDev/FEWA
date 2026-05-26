import time
import re
import uuid
import httpx
from datetime import datetime, timezone
from typing import Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from agora_token_builder import RtcTokenBuilder
from agora_token_builder.RtcTokenBuilder import Role_Publisher, Role_Subscriber
from agora_agent.agentkit.token import generate_convo_ai_token
from app.config import settings
from app.db.couchbase import get_collection

router = APIRouter(prefix="/agora", tags=["agora"])

DEFAULT_TTL_SECONDS = 3600
MAX_TTL_SECONDS = 86400
CHANNEL_NAME_PATTERN = re.compile(r"^[A-Za-z0-9_.-]{1,64}$")
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
    token_ttl_seconds: int = 3600


class ConvoUserTokenRequest(BaseModel):
    channel_name: str = "workflow-ph-cae"
    user_uid: str = "1002"
    token_ttl_seconds: int = 3600


class ConvoStopRequest(BaseModel):
    agent_id: str
    channel_name: str = "workflow-ph-cae"
    agent_uid: str = "1001"
    token_ttl_seconds: int = 3600


class ConvoInterruptRequest(BaseModel):
    agent_id: str
    channel_name: str = "workflow-ph-cae"
    agent_uid: str = "1001"
    token_ttl_seconds: int = 3600


class ConvoHistoryRequest(BaseModel):
    agent_id: str
    channel_name: str = "workflow-ph-cae"
    agent_uid: str = "1001"
    token_ttl_seconds: int = 3600


class ConvoMemorySaveRequest(BaseModel):
    agent_id: str
    channel_name: str = "workflow-ph-cae"
    agent_uid: str = "1001"
    user_uid: str = "1002"
    token_ttl_seconds: int = 3600


class ConvoMemoryInjectRequest(BaseModel):
    agent_id: str
    channel_name: str = "workflow-ph-cae"
    agent_uid: str = "1001"
    user_uid: str = "1002"
    system_messages: list[dict[str, str]] | None = None
    token_ttl_seconds: int = 3600


def _require_token_issuer_auth() -> None:
    # Hook for future endpoint auth (API key/JWT).
    return None


def _validate_request(req: TokenRequest) -> None:
    if not req.channel_name or not req.channel_name.strip():
        raise HTTPException(status_code=400, detail="channel_name is required")

    if not CHANNEL_NAME_PATTERN.fullmatch(req.channel_name.strip()):
        raise HTTPException(
            status_code=400,
            detail="channel_name must match ^[A-Za-z0-9_.-]{1,64}$",
        )

    if req.uid < 0:
        raise HTTPException(status_code=400, detail="uid must be greater than or equal to 0")

    normalized_role = req.role.lower().strip()
    if normalized_role not in ROLE_MAP:
        raise HTTPException(
            status_code=400,
            detail="role must be one of: publisher, subscriber",
        )

    if req.ttl_seconds < 60 or req.ttl_seconds > MAX_TTL_SECONDS:
        raise HTTPException(
            status_code=400,
            detail=f"ttl_seconds must be between 60 and {MAX_TTL_SECONDS}",
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


def _validate_uid_string(uid: str, field_name: str) -> None:
    if not re.fullmatch(r"^[0-9]{1,18}$", uid):
        raise HTTPException(status_code=400, detail=f"{field_name} must be a numeric string UID")


def _validate_agent_ops_inputs(channel_name: str, agent_uid: str, token_ttl_seconds: int, agent_id: str | None = None) -> None:
    if not channel_name or not CHANNEL_NAME_PATTERN.fullmatch(channel_name):
        raise HTTPException(
            status_code=400,
            detail="channel_name must match ^[A-Za-z0-9_.-]{1,64}$",
        )
    _validate_uid_string(agent_uid, "agent_uid")
    if token_ttl_seconds < 60 or token_ttl_seconds > MAX_TTL_SECONDS:
        raise HTTPException(
            status_code=400,
            detail=f"token_ttl_seconds must be between 60 and {MAX_TTL_SECONDS}",
        )
    if agent_id is not None and not agent_id.strip():
        raise HTTPException(status_code=400, detail="agent_id is required")


async def _fetch_agent_history(agent_id: str, channel_name: str, agent_uid: str, token_ttl_seconds: int) -> dict[str, Any]:
    agent_token = _build_convo_token(channel_name, agent_uid, token_ttl_seconds)
    url = (
        f"{settings.agora_convo_api_base}/api/conversational-ai-agent/v2/"
        f"projects/{settings.agora_app_id}/agents/{agent_id}/history"
    )
    headers = {
        "Authorization": f"agora token={agent_token}",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(url, headers=headers)

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Failed to fetch agent history",
                "status_code": response.status_code,
                "body": response.text,
            },
        )

    return response.json() if response.text else {}


def _build_memory_summary(contents: list[dict[str, Any]]) -> str:
    # Keep this deterministic and cheap for prototype: summarize latest turns.
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
    _validate_request(req)

    if not settings.agora_app_id or not settings.agora_app_certificate:
        raise HTTPException(
            status_code=500,
            detail="Missing Agora credentials. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE.",
        )

    channel_name = req.channel_name.strip()
    normalized_role = req.role.lower().strip()

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


@router.post("/convo/start")
async def start_conversational_agent(req: ConvoStartRequest):
    _require_token_issuer_auth()

    if not settings.agora_app_id or not settings.agora_app_certificate:
        raise HTTPException(
            status_code=500,
            detail="Missing Agora credentials. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE.",
        )

    channel_name = req.channel_name.strip()
    if not channel_name or not CHANNEL_NAME_PATTERN.fullmatch(channel_name):
        raise HTTPException(
            status_code=400,
            detail="channel_name must match ^[A-Za-z0-9_.-]{1,64}$",
        )

    if req.token_ttl_seconds < 60 or req.token_ttl_seconds > MAX_TTL_SECONDS:
        raise HTTPException(
            status_code=400,
            detail=f"token_ttl_seconds must be between 60 and {MAX_TTL_SECONDS}",
        )

    agent_uid = req.agent_uid.strip()
    user_uid = req.user_uid.strip()
    if not agent_uid or not user_uid:
        raise HTTPException(status_code=400, detail="agent_uid and user_uid are required")
    _validate_uid_string(agent_uid, "agent_uid")
    _validate_uid_string(user_uid, "user_uid")

    agent_name = (req.agent_name or f"fewa-agent-{uuid.uuid4().hex[:8]}").strip()
    if not agent_name:
        raise HTTPException(status_code=400, detail="agent_name cannot be empty")

    agent_token = _build_convo_token(channel_name, agent_uid, req.token_ttl_seconds)
    user_token = _build_convo_token(channel_name, user_uid, req.token_ttl_seconds)

    properties: dict = {
        "channel": channel_name,
        "token": agent_token,
        "agent_rtc_uid": agent_uid,
        "remote_rtc_uids": [user_uid],
        "enable_string_uid": False,
        "idle_timeout": settings.agora_convo_default_idle_timeout,
        "advanced_features": {
            "enable_rtm": True,
        },
        "turn_detection": {
            "mode": "default",
            "config": {
                "speech_threshold": 0.5,
                "start_of_speech": {
                    "mode": "vad",
                    "vad_config": {
                        # Use less aggressive VAD thresholds to avoid constant barge-in flapping.
                        "interrupt_duration_ms": 600,
                        "speaking_interrupt_duration_ms": 900,
                        "prefix_padding_ms": 1500,
                    },
                },
                "end_of_speech": {
                    "mode": "vad",
                    "vad_config": {
                        "silence_duration_ms": 1200,
                    },
                },
            },
        },
        "parameters": {
            "data_channel": "rtm",
            # Recommended voice scenario for conversational playback quality.
            "audio_scenario": "chorus",
            "enable_metrics": True,
            "enable_error_message": True,
            "transcript": {
                "enable": True,
            },
        },
        "tts": {
            "params": {
                "voice": (req.tts_voice or settings.agora_convo_default_tts_voice),
            }
        },
    }

    payload: dict = {
        "name": agent_name,
        "properties": properties,
    }

    effective_pipeline_id = (req.pipeline_id or settings.agora_convo_default_pipeline_id).strip()
    if effective_pipeline_id:
        payload["pipeline_id"] = effective_pipeline_id
    else:
        payload["preset"] = (req.preset or settings.agora_convo_default_preset)

    url = (
        f"{settings.agora_convo_api_base}/api/conversational-ai-agent/v2/"
        f"projects/{settings.agora_app_id}/join"
    )
    headers = {
        "Authorization": f"agora token={agent_token}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(url, headers=headers, json=payload)

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Failed to start Agora Conversational AI agent",
                "status_code": response.status_code,
                "body": response.text,
            },
        )

    data = response.json() if response.text else {}
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


@router.post("/convo/user-token")
async def create_convo_user_token(req: ConvoUserTokenRequest):
    _require_token_issuer_auth()

    if not settings.agora_app_id or not settings.agora_app_certificate:
        raise HTTPException(
            status_code=500,
            detail="Missing Agora credentials. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE.",
        )

    channel_name = req.channel_name.strip()
    user_uid = req.user_uid.strip()
    if not channel_name or not CHANNEL_NAME_PATTERN.fullmatch(channel_name):
        raise HTTPException(
            status_code=400,
            detail="channel_name must match ^[A-Za-z0-9_.-]{1,64}$",
        )
    _validate_uid_string(user_uid, "user_uid")
    if req.token_ttl_seconds < 60 or req.token_ttl_seconds > MAX_TTL_SECONDS:
        raise HTTPException(
            status_code=400,
            detail=f"token_ttl_seconds must be between 60 and {MAX_TTL_SECONDS}",
        )

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
async def stop_conversational_agent(req: ConvoStopRequest):
    _require_token_issuer_auth()

    if not settings.agora_app_id or not settings.agora_app_certificate:
        raise HTTPException(
            status_code=500,
            detail="Missing Agora credentials. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE.",
        )

    channel_name = req.channel_name.strip()
    agent_uid = req.agent_uid.strip()
    agent_id = req.agent_id.strip()

    if not channel_name or not agent_uid or not agent_id:
        raise HTTPException(status_code=400, detail="channel_name, agent_uid, and agent_id are required")
    _validate_uid_string(agent_uid, "agent_uid")

    if req.token_ttl_seconds < 60 or req.token_ttl_seconds > MAX_TTL_SECONDS:
        raise HTTPException(
            status_code=400,
            detail=f"token_ttl_seconds must be between 60 and {MAX_TTL_SECONDS}",
        )

    agent_token = _build_convo_token(channel_name, agent_uid, req.token_ttl_seconds)
    url = (
        f"{settings.agora_convo_api_base}/api/conversational-ai-agent/v2/"
        f"projects/{settings.agora_app_id}/agents/{agent_id}/leave"
    )
    headers = {
        "Authorization": f"agora token={agent_token}",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(url, headers=headers)

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Failed to stop Agora Conversational AI agent",
                "status_code": response.status_code,
                "body": response.text,
            },
        )

    return {"ok": True, "agent_id": agent_id}


@router.post("/convo/interrupt")
async def interrupt_conversational_agent(req: ConvoInterruptRequest):
    _require_token_issuer_auth()

    if not settings.agora_app_id or not settings.agora_app_certificate:
        raise HTTPException(
            status_code=500,
            detail="Missing Agora credentials. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE.",
        )

    channel_name = req.channel_name.strip()
    agent_uid = req.agent_uid.strip()
    agent_id = req.agent_id.strip()
    _validate_agent_ops_inputs(channel_name, agent_uid, req.token_ttl_seconds, agent_id=agent_id)

    agent_token = _build_convo_token(channel_name, agent_uid, req.token_ttl_seconds)
    url = (
        f"{settings.agora_convo_api_base}/api/conversational-ai-agent/v2/"
        f"projects/{settings.agora_app_id}/agents/{agent_id}/interrupt"
    )
    headers = {
        "Authorization": f"agora token={agent_token}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(url, headers=headers, json={})

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Failed to interrupt agent",
                "status_code": response.status_code,
                "body": response.text,
            },
        )

    return response.json() if response.text else {"ok": True, "agent_id": agent_id}


@router.post("/convo/history")
async def get_conversational_agent_history(req: ConvoHistoryRequest):
    _require_token_issuer_auth()

    if not settings.agora_app_id or not settings.agora_app_certificate:
        raise HTTPException(
            status_code=500,
            detail="Missing Agora credentials. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE.",
        )

    channel_name = req.channel_name.strip()
    agent_uid = req.agent_uid.strip()
    agent_id = req.agent_id.strip()
    _validate_agent_ops_inputs(channel_name, agent_uid, req.token_ttl_seconds, agent_id=agent_id)

    data = await _fetch_agent_history(agent_id, channel_name, agent_uid, req.token_ttl_seconds)
    contents = data.get("contents") or []

    return {
        "agent_id": data.get("agent_id", agent_id),
        "status": data.get("status", ""),
        "start_ts": data.get("start_ts"),
        "contents": contents,
        "message_count": len(contents),
    }


@router.post("/convo/memory/save")
async def save_conversational_memory(req: ConvoMemorySaveRequest):
    _require_token_issuer_auth()

    if not settings.agora_app_id or not settings.agora_app_certificate:
        raise HTTPException(
            status_code=500,
            detail="Missing Agora credentials. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE.",
        )

    channel_name = req.channel_name.strip()
    agent_uid = req.agent_uid.strip()
    user_uid = req.user_uid.strip()
    agent_id = req.agent_id.strip()
    _validate_agent_ops_inputs(channel_name, agent_uid, req.token_ttl_seconds, agent_id=agent_id)
    _validate_uid_string(user_uid, "user_uid")

    history = await _fetch_agent_history(agent_id, channel_name, agent_uid, req.token_ttl_seconds)
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

    if not settings.agora_app_id or not settings.agora_app_certificate:
        raise HTTPException(
            status_code=500,
            detail="Missing Agora credentials. Set AGORA_APP_ID and AGORA_APP_CERTIFICATE.",
        )

    channel_name = req.channel_name.strip()
    agent_uid = req.agent_uid.strip()
    user_uid = req.user_uid.strip()
    agent_id = req.agent_id.strip()
    _validate_agent_ops_inputs(channel_name, agent_uid, req.token_ttl_seconds, agent_id=agent_id)
    _validate_uid_string(user_uid, "user_uid")

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

    agent_token = _build_convo_token(channel_name, agent_uid, req.token_ttl_seconds)
    url = (
        f"{settings.agora_convo_api_base}/api/conversational-ai-agent/v2/"
        f"projects/{settings.agora_app_id}/agents/{agent_id}/update"
    )
    payload = {
        "properties": {
            "llm": {
                "system_messages": normalized_messages,
            }
        }
    }
    headers = {
        "Authorization": f"agora token={agent_token}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(url, headers=headers, json=payload)

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail={
                "message": "Failed to inject memory via update agent configuration",
                "status_code": response.status_code,
                "body": response.text,
            },
        )

    return {
        "ok": True,
        "agent_id": agent_id,
        "system_messages_count": len(normalized_messages),
        "loaded_from_key": loaded_from_key,
        "raw": response.json() if response.text else {},
    }
