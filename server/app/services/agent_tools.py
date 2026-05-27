import json
import uuid
from datetime import datetime, timezone
from typing import Any

from app.models.conversation import Conversation
from app.models.lead import Lead
from app.services.follow_up import generate_follow_up
from app.services.lead_scorer import score_lead
from app.services.offer_recommender import recommend_offer

TOOL_RUNTIME_INSTRUCTIONS = """When a user expresses clear intent, call tools immediately.

Scheduling intent:
- If the user agrees to a call, asks to schedule, or provides time/day details, call schedule_discovery_call.

Pricing intent:
- If the user asks for price/package quote/proposal, call request_pricing_package.

Human handoff intent:
- If the user asks for a human, manager, specialist, or escalation, call escalate_to_human.

You may still call MVP tools when relevant:
- extract_lead_info, detect_objection, score_lead, recommend_offer, book_discovery_call, generate_follow_up.

Always keep the assistant response concise and action-oriented after tools are executed."""

SALES_AGENT_TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "schedule_discovery_call",
            "description": "Schedule or confirm a discovery call when buying intent and time preference are present.",
            "parameters": {
                "type": "object",
                "properties": {
                    "preferred_day": {"type": "string"},
                    "preferred_time": {"type": "string"},
                    "timezone": {"type": "string"},
                    "confirmed": {"type": "boolean"},
                    "notes": {"type": "string"},
                },
                "required": ["confirmed"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "request_pricing_package",
            "description": "Use when the lead requests pricing, package rates, proposal, or quote details.",
            "parameters": {
                "type": "object",
                "properties": {
                    "package_name": {"type": "string"},
                    "reason": {"type": "string"},
                    "urgency": {"type": "string"},
                },
                "required": ["reason"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "escalate_to_human",
            "description": "Escalate to a human sales teammate when requested or when confidence is low/high-stakes details are needed.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reason": {"type": "string"},
                    "priority": {"type": "string", "enum": ["normal", "high", "urgent"]},
                    "notes": {"type": "string"},
                },
                "required": ["reason"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "extract_lead_info",
            "description": "Extract and persist structured lead profile information from dialogue context.",
            "parameters": {
                "type": "object",
                "properties": {
                    "company": {"type": "string"},
                    "industry": {"type": "string"},
                    "pain_point": {"type": "string"},
                    "timeline": {"type": "string"},
                    "budget_readiness": {"type": "string"},
                    "decision_maker": {"type": "string"},
                    "contact_name": {"type": "string"},
                    "contact_email": {"type": "string"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "detect_objection",
            "description": "Detect and store a sales objection raised by the lead.",
            "parameters": {
                "type": "object",
                "properties": {
                    "objection_type": {
                        "type": "string",
                        "enum": [
                            "price_concern",
                            "needs_approval",
                            "has_supplier",
                            "no_budget",
                            "not_urgent",
                            "wants_proof",
                            "just_browsing",
                        ],
                    },
                    "raw_quote": {"type": "string"},
                },
                "required": ["objection_type"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "score_lead",
            "description": "Recompute and persist lead score and lead temperature.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "recommend_offer",
            "description": "Recompute and persist recommended offer based on current lead profile.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "book_discovery_call",
            "description": "Legacy alias of schedule_discovery_call.",
            "parameters": {
                "type": "object",
                "properties": {
                    "preferred_day": {"type": "string"},
                    "preferred_time": {"type": "string"},
                    "timezone": {"type": "string"},
                    "confirmed": {"type": "boolean"},
                },
                "required": ["confirmed"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_follow_up",
            "description": "Generate follow-up draft content preview from current lead context.",
            "parameters": {
                "type": "object",
                "properties": {},
            },
        },
    },
]

TOOL_ALIASES = {
    "book_discovery_call": "schedule_discovery_call",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_tool_arguments(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if not isinstance(raw, str):
        return {}
    raw = raw.strip()
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


def _normalize_tool_name(name: str) -> str:
    canonical = TOOL_ALIASES.get(name, name)
    return canonical.strip()


def _append_unique(items: list[str], value: str) -> None:
    clean = value.strip()
    if clean and clean not in items:
        items.append(clean)


def _log_tool_activity(
    conversation: Conversation,
    *,
    tool_name: str,
    canonical_tool: str,
    args: dict[str, Any],
    success: bool,
    message: str,
) -> dict[str, Any]:
    event = {
        "id": f"tool_event::{uuid.uuid4()}",
        "tool": tool_name,
        "canonical_tool": canonical_tool,
        "timestamp": _now_iso(),
        "args": args,
        "success": success,
        "message": message,
    }
    conversation.tool_activity_log.append(event)
    if len(conversation.tool_activity_log) > 100:
        conversation.tool_activity_log = conversation.tool_activity_log[-100:]
    return event


def _build_slot_text(args: dict[str, Any]) -> str:
    preferred_day = str(args.get("preferred_day", "")).strip()
    preferred_time = str(args.get("preferred_time", "")).strip()
    timezone_name = str(args.get("timezone", "Asia/Manila")).strip() or "Asia/Manila"
    slot_core = " ".join([p for p in [preferred_day, preferred_time] if p]).strip()
    if not slot_core:
        slot_core = "TBD"
    return f"{slot_core} ({timezone_name})"


async def _handle_schedule_discovery_call(
    *,
    args: dict[str, Any],
    lead: Lead,
    lead_id: str,
    conversation_id: str,
    calls_col: Any,
) -> dict[str, Any]:
    confirmed = bool(args.get("confirmed", False))
    status = "booked" if confirmed else "proposed"
    slot_text = _build_slot_text(args)
    call_id = f"discovery_call::{uuid.uuid4()}"
    now = _now_iso()
    notes = str(args.get("notes", "")).strip()

    call_doc = {
        "type": "discovery_call",
        "lead_id": lead_id,
        "conversation_id": conversation_id,
        "slot_start": slot_text,
        "slot_end": None,
        "timezone": str(args.get("timezone", "Asia/Manila")).strip() or "Asia/Manila",
        "status": status,
        "notes": notes,
        "created_at": now,
        "updated_at": now,
    }
    calls_col.insert(call_id, call_doc)

    lead.call_status = status
    lead.call_slot = slot_text
    lead.updated_at = now

    return {
        "call_id": call_id,
        "status": status,
        "slot": slot_text,
    }


async def _handle_request_pricing_package(
    *,
    args: dict[str, Any],
    lead: Lead,
    conversation: Conversation,
) -> dict[str, Any]:
    reason = str(args.get("reason", "")).strip() or "Lead requested pricing/package details"
    package_name = str(args.get("package_name", "")).strip()
    urgency = str(args.get("urgency", "")).strip()

    lead.asked_for_proposal = True
    _append_unique(conversation.objections, "Wants pricing details first")
    _append_unique(conversation.buying_signals, "Requested pricing package")
    lead.objections = list(conversation.objections)
    lead.buying_signals = list(conversation.buying_signals)

    lead.updated_at = _now_iso()
    conversation.updated_at = _now_iso()

    return {
        "reason": reason,
        "package_name": package_name,
        "urgency": urgency,
    }


async def _handle_escalate_to_human(
    *,
    args: dict[str, Any],
    lead: Lead,
    conversation: Conversation,
) -> dict[str, Any]:
    reason = str(args.get("reason", "")).strip() or "Human assistance requested"
    priority = str(args.get("priority", "normal")).strip().lower() or "normal"
    notes = str(args.get("notes", "")).strip()
    priority = priority if priority in {"normal", "high", "urgent"} else "normal"

    lead.next_best_action = f"Escalate to human sales rep ({priority}): {reason}"
    lead.updated_at = _now_iso()
    _append_unique(conversation.buying_signals, "Requested human escalation")
    if notes:
        _append_unique(conversation.objections, f"Escalation note: {notes}")
    lead.buying_signals = list(conversation.buying_signals)
    lead.objections = list(conversation.objections)
    conversation.updated_at = _now_iso()

    return {
        "reason": reason,
        "priority": priority,
        "notes": notes,
    }


async def _handle_extract_lead_info(*, args: dict[str, Any], lead: Lead) -> dict[str, Any]:
    changed_fields: list[str] = []
    mapping = {
        "company": "company",
        "industry": "industry",
        "pain_point": "pain_point",
        "timeline": "timeline",
        "budget_readiness": "budget_readiness",
        "contact_name": "name",
        "contact_email": "email",
    }
    for source_key, target_field in mapping.items():
        value = str(args.get(source_key, "")).strip()
        if value:
            setattr(lead, target_field, value)
            changed_fields.append(target_field)

    decision_maker = args.get("decision_maker")
    if isinstance(decision_maker, bool):
        lead.decision_maker = "Yes" if decision_maker else "No"
        changed_fields.append("decision_maker")
    elif isinstance(decision_maker, str) and decision_maker.strip():
        lead.decision_maker = decision_maker.strip()
        changed_fields.append("decision_maker")

    lead.updated_at = _now_iso()
    return {"changed_fields": changed_fields}


async def _handle_detect_objection(*, args: dict[str, Any], lead: Lead, conversation: Conversation) -> dict[str, Any]:
    objection_type = str(args.get("objection_type", "")).strip()
    raw_quote = str(args.get("raw_quote", "")).strip()
    if objection_type:
        _append_unique(conversation.objections, objection_type)
    if raw_quote:
        _append_unique(conversation.objections, raw_quote)
    lead.objections = list(conversation.objections)
    lead.updated_at = _now_iso()
    conversation.updated_at = _now_iso()
    return {"objection_type": objection_type, "raw_quote": raw_quote}


async def _handle_score_lead(*, lead: Lead) -> dict[str, Any]:
    score, temperature, breakdown = score_lead(lead, lead.asked_for_proposal or False)
    lead.lead_score = score
    lead.lead_temperature = temperature
    lead.score_breakdown = breakdown
    lead.updated_at = _now_iso()
    return {
        "lead_score": score,
        "lead_temperature": temperature,
    }


async def _handle_recommend_offer(*, lead: Lead) -> dict[str, Any]:
    offer = recommend_offer(lead)
    lead.recommended_offer = offer
    lead.updated_at = _now_iso()
    return {"recommended_offer": offer}


async def _handle_generate_follow_up(*, lead: Lead) -> dict[str, Any]:
    follow_up = await generate_follow_up(lead)
    return {
        "subject": follow_up.get("subject", ""),
        "body_preview": (follow_up.get("body", "") or "")[:240],
    }


async def execute_agent_tool_calls(
    *,
    tool_calls: list[dict[str, Any]],
    lead_id: str,
    conversation_id: str,
    lead: Lead,
    conversation: Conversation,
    calls_col: Any,
) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    fired_events: list[dict[str, Any]] = []
    tool_outputs_for_model: list[dict[str, str]] = []

    for call in tool_calls:
        tool_name = str(call.get("name", "")).strip()
        if not tool_name:
            continue
        canonical_tool = _normalize_tool_name(tool_name)
        tool_call_id = str(call.get("id", "")).strip() or f"tool_call_{uuid.uuid4().hex}"
        args = _parse_tool_arguments(call.get("arguments", ""))

        success = True
        message = "ok"
        output: dict[str, Any] = {}

        try:
            if canonical_tool == "schedule_discovery_call":
                output = await _handle_schedule_discovery_call(
                    args=args,
                    lead=lead,
                    lead_id=lead_id,
                    conversation_id=conversation_id,
                    calls_col=calls_col,
                )
            elif canonical_tool == "request_pricing_package":
                output = await _handle_request_pricing_package(args=args, lead=lead, conversation=conversation)
            elif canonical_tool == "escalate_to_human":
                output = await _handle_escalate_to_human(args=args, lead=lead, conversation=conversation)
            elif canonical_tool == "extract_lead_info":
                output = await _handle_extract_lead_info(args=args, lead=lead)
            elif canonical_tool == "detect_objection":
                output = await _handle_detect_objection(args=args, lead=lead, conversation=conversation)
            elif canonical_tool == "score_lead":
                output = await _handle_score_lead(lead=lead)
            elif canonical_tool == "recommend_offer":
                output = await _handle_recommend_offer(lead=lead)
            elif canonical_tool == "generate_follow_up":
                output = await _handle_generate_follow_up(lead=lead)
            else:
                success = False
                message = f"unsupported_tool: {tool_name}"
                output = {"error": message}
        except Exception as exc:
            success = False
            message = f"tool_execution_failed: {exc}"
            output = {"error": message}

        event = _log_tool_activity(
            conversation,
            tool_name=tool_name,
            canonical_tool=canonical_tool,
            args=args,
            success=success,
            message=message,
        )
        event["output"] = output
        fired_events.append(event)

        tool_outputs_for_model.append(
            {
                "tool_call_id": tool_call_id,
                "output": json.dumps(output),
            }
        )

    return fired_events, tool_outputs_for_model
