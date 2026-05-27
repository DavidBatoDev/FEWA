from __future__ import annotations

from typing import Any


LEAD_STRING_FIELDS = {
    "type",
    "campaign_id",
    "name",
    "email",
    "phone",
    "company",
    "industry",
    "pain_point",
    "current_solution",
    "timeline",
    "budget_readiness",
    "decision_maker",
    "buying_intent",
    "intake_form_id",
    "call_status",
    "call_slot",
    "context_status",
    "conversation_summary",
    "recommended_offer",
    "next_best_action",
    "status",
    "created_at",
    "updated_at",
}

LEAD_LIST_STRING_FIELDS = {
    "objections",
    "buying_signals",
}

VALID_LEAD_TEMPERATURES = {"Hot", "Warm", "Cold"}
VALID_LEAD_STATUSES = {"new", "in_progress", "qualified", "disqualified"}
VALID_TRANSCRIPT_ROLES = {"user", "assistant"}


def _as_clean_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, bool):
        return "Yes" if value else "No"
    return str(value).strip()


def _as_optional_string(value: Any) -> str | None:
    text = _as_clean_string(value)
    return text if text else None


def _as_bool(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        clean = value.strip().lower()
        if clean in {"true", "1", "yes", "y", "t", "confirmed"}:
            return True
        if clean in {"false", "0", "no", "n", "f"}:
            return False
    return default


def _as_int(value: Any, default: int = 0) -> int:
    if isinstance(value, bool):
        return 1 if value else 0
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _as_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return float(value)
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _as_string_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        source = value
    elif isinstance(value, str):
        source = [value]
    else:
        source = [value]

    cleaned: list[str] = []
    for item in source:
        text = _as_clean_string(item)
        if text and text not in cleaned:
            cleaned.append(text)
    return cleaned


def _sanitize_transcript(transcript: Any) -> list[dict[str, str]]:
    if not isinstance(transcript, list):
        return []

    cleaned: list[dict[str, str]] = []
    for item in transcript:
        if not isinstance(item, dict):
            continue
        role = _as_clean_string(item.get("role", "")).lower()
        if role not in VALID_TRANSCRIPT_ROLES:
            continue
        message = _as_clean_string(item.get("message", ""))
        if not message:
            continue
        timestamp = _as_clean_string(item.get("timestamp", "")) or ""
        cleaned.append(
            {
                "role": role,
                "message": message,
                "timestamp": timestamp,
            }
        )
    return cleaned


def _sanitize_order_draft(order_draft: Any) -> dict[str, Any]:
    if not isinstance(order_draft, dict):
        return {}

    items_raw = order_draft.get("items")
    items: list[dict[str, Any]] = []
    if isinstance(items_raw, list):
        for item in items_raw:
            if not isinstance(item, dict):
                continue
            product_id = _as_clean_string(item.get("product_id", ""))
            if not product_id:
                continue
            quantity = _as_int(item.get("quantity", 1), default=1)
            if quantity <= 0:
                quantity = 1
            items.append({"product_id": product_id, "quantity": quantity})

    return {
        "customer_name": _as_clean_string(order_draft.get("customer_name", "")),
        "email": _as_clean_string(order_draft.get("email", "")),
        "phone": _as_clean_string(order_draft.get("phone", "")),
        "address": _as_clean_string(order_draft.get("address", "")),
        "notes": _as_clean_string(order_draft.get("notes", "")),
        "currency": _as_clean_string(order_draft.get("currency", "")) or "PHP",
        "items": items,
    }


def _sanitize_commerce_state(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {}

    preferences = value.get("preferences", {})
    if not isinstance(preferences, dict):
        preferences = {}
    budget_max = _as_float(preferences.get("budget_max"))

    return {
        "preferences": {
            "category": _as_clean_string(preferences.get("category", "")),
            "budget_max": budget_max,
            "brand_preference": _as_clean_string(preferences.get("brand_preference", "")),
            "use_case": _as_clean_string(preferences.get("use_case", "")),
            "priorities": _as_string_list(preferences.get("priorities", [])),
        },
        "last_candidates": _as_string_list(value.get("last_candidates", [])),
        "order_draft": _sanitize_order_draft(value.get("order_draft", {})),
        "order_verified": _as_bool(value.get("order_verified", False), default=False),
        "last_order_id": _as_clean_string(value.get("last_order_id", "")),
        "last_order_reference": _as_clean_string(value.get("last_order_reference", "")),
    }


def sanitize_lead_dict(value: Any) -> dict[str, Any]:
    raw = value if isinstance(value, dict) else {}
    out: dict[str, Any] = {}

    for field in LEAD_STRING_FIELDS:
        if field in raw:
            out[field] = _as_optional_string(raw.get(field))

    for field in LEAD_LIST_STRING_FIELDS:
        out[field] = _as_string_list(raw.get(field, []))

    out["lead_score"] = _as_int(raw.get("lead_score", 0), default=0)
    out["asked_for_proposal"] = _as_bool(raw.get("asked_for_proposal", False), default=False)
    out["score_breakdown"] = raw.get("score_breakdown") if isinstance(raw.get("score_breakdown"), dict) else None

    temp = _as_optional_string(raw.get("lead_temperature"))
    out["lead_temperature"] = temp if temp in VALID_LEAD_TEMPERATURES else None

    status = _as_optional_string(raw.get("status")) or "new"
    out["status"] = status if status in VALID_LEAD_STATUSES else "new"

    out["type"] = _as_clean_string(raw.get("type", "")) or "lead"
    out["created_at"] = _as_clean_string(raw.get("created_at", ""))
    out["updated_at"] = _as_clean_string(raw.get("updated_at", ""))
    return out


def sanitize_conversation_dict(value: Any) -> dict[str, Any]:
    raw = value if isinstance(value, dict) else {}
    session_context = raw.get("session_context")
    if isinstance(session_context, dict):
        cleaned_context = {
            _as_clean_string(k): _as_clean_string(v)
            for k, v in session_context.items()
            if _as_clean_string(k)
        }
    else:
        cleaned_context = None

    processed_turn_keys = _as_string_list(raw.get("processed_turn_keys", []))
    tool_activity_log = raw.get("tool_activity_log")
    if isinstance(tool_activity_log, list):
        cleaned_log = [item for item in tool_activity_log if isinstance(item, dict)]
    else:
        cleaned_log = []

    return {
        "type": _as_clean_string(raw.get("type", "")) or "conversation",
        "lead_id": _as_clean_string(raw.get("lead_id", "")),
        "session_context": cleaned_context,
        "processed_turn_keys": processed_turn_keys,
        "transcript": _sanitize_transcript(raw.get("transcript", [])),
        "summary": _as_optional_string(raw.get("summary")),
        "objections": _as_string_list(raw.get("objections", [])),
        "buying_signals": _as_string_list(raw.get("buying_signals", [])),
        "tool_activity_log": cleaned_log,
        "commerce_state": _sanitize_commerce_state(raw.get("commerce_state", {})),
        "created_at": _as_clean_string(raw.get("created_at", "")),
        "updated_at": _as_clean_string(raw.get("updated_at", "")),
    }


def sanitize_extracted_profile(value: Any) -> dict[str, Any]:
    raw = value if isinstance(value, dict) else {}

    return {
        "name": _as_optional_string(raw.get("name")),
        "company": _as_optional_string(raw.get("company")),
        "industry": _as_optional_string(raw.get("industry")),
        "pain_point": _as_optional_string(raw.get("pain_point")),
        "current_solution": _as_optional_string(raw.get("current_solution")),
        "timeline": _as_optional_string(raw.get("timeline")),
        "budget_readiness": _as_optional_string(raw.get("budget_readiness")),
        "decision_maker": _as_optional_string(raw.get("decision_maker")),
        "buying_intent": _as_optional_string(raw.get("buying_intent")),
        "objections": _as_string_list(raw.get("objections", [])),
        "buying_signals": _as_string_list(raw.get("buying_signals", [])),
        "asked_for_proposal": _as_bool(raw.get("asked_for_proposal", False), default=False),
    }
