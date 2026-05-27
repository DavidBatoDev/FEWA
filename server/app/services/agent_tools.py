import json
import re
import uuid
from datetime import datetime, timezone
from typing import Any

from app.models.conversation import Conversation
from app.models.lead import Lead
from app.services.follow_up import generate_follow_up
from app.services.lead_scorer import score_lead
from app.services.offer_recommender import recommend_offer

B2B_TOOL_RUNTIME_INSTRUCTIONS = """When a user expresses clear intent, call tools immediately.

Scheduling intent:
- If the user agrees to a call, asks to schedule, or provides time/day details, call schedule_discovery_call.

Pricing intent:
- If the user asks for price/package quote/proposal, call request_pricing_package.

Human handoff intent:
- If the user asks for a human, manager, specialist, or escalation, call escalate_to_human.

You may still call MVP tools when relevant:
- extract_lead_info, detect_objection, score_lead, recommend_offer, book_discovery_call, generate_follow_up.

Always keep the assistant response concise and action-oriented after tools are executed."""

B2C_TOOL_RUNTIME_INSTRUCTIONS = """When enough commerce context is available, call tools in this sequence:

1) extract_preferences
2) search_products
3) compare_items (if the user asks to compare)
4) build_order (once product choice and customer details are provided)
5) verify_order
6) checkout_prep (only after order confirmation)

Always use tools for order-building state updates. Keep replies short and helpful."""

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
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "recommend_offer",
            "description": "Recompute and persist recommended offer based on current lead profile.",
            "parameters": {"type": "object", "properties": {}},
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
            "parameters": {"type": "object", "properties": {}},
        },
    },
]

COMMERCE_AGENT_TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "extract_preferences",
            "description": "Extract customer shopping preferences like category, budget, brand, and use case.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {"type": "string"},
                    "budget_max": {"type": "number"},
                    "brand_preference": {"type": "string"},
                    "use_case": {"type": "string"},
                    "priorities": {"type": "array", "items": {"type": "string"}},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_products",
            "description": "Search catalog using known preferences and return top product matches.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "category": {"type": "string"},
                    "brand": {"type": "string"},
                    "use_case": {"type": "string"},
                    "budget_max": {"type": "number"},
                    "limit": {"type": "integer"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compare_items",
            "description": "Compare selected products side-by-side for decision support.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_ids": {"type": "array", "items": {"type": "string"}},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "build_order",
            "description": "Build or update an order draft with selected product and customer details.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_id": {"type": "string"},
                    "quantity": {"type": "integer"},
                    "customer_name": {"type": "string"},
                    "email": {"type": "string"},
                    "phone": {"type": "string"},
                    "address": {"type": "string"},
                    "notes": {"type": "string"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "verify_order",
            "description": "Validate the order draft and return a confirmation-ready summary.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "checkout_prep",
            "description": "Persist a confirmed order and return checkout-ready details and reference.",
            "parameters": {
                "type": "object",
                "properties": {
                    "confirmed": {"type": "boolean"},
                    "payment_method": {"type": "string"},
                },
            },
        },
    },
]

TOOL_ALIASES = {
    "book_discovery_call": "schedule_discovery_call",
    "search_product": "search_products",
    "match_prefs": "extract_preferences",
    "build_order_form": "build_order",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_tool_arguments(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        return raw
    if not isinstance(raw, str):
        return {}
    text = raw.strip()
    if not text:
        return {}
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


def _normalize_tool_name(name: str) -> str:
    return TOOL_ALIASES.get(name, name).strip()


def _append_unique(items: list[str], value: str) -> None:
    clean = value.strip()
    if clean and clean not in items:
        items.append(clean)


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
    try:
        if isinstance(value, bool):
            return 1 if value else 0
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _as_float(value: Any, default: float | None = None) -> float | None:
    try:
        if value is None or value == "":
            return default
        if isinstance(value, bool):
            return float(value)
        return float(value)
    except (TypeError, ValueError):
        return default


def _as_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _as_str_list(value: Any) -> list[str]:
    if value is None:
        return []
    items = value if isinstance(value, list) else [value]
    out: list[str] = []
    for item in items:
        text = _as_str(item)
        if text and text not in out:
            out.append(text)
    return out


def _build_order_reference() -> str:
    year = datetime.now(timezone.utc).year
    suffix = uuid.uuid4().hex[:6].upper()
    return f"WPH-{year}-{suffix}"


def _normalize_product_id(product_id: str) -> str:
    clean = product_id.strip()
    if clean.startswith("product::"):
        return clean
    return f"product::{clean}"


def _product_from_row(row: dict) -> dict[str, Any]:
    product = {k: v for k, v in row.items() if k != "id"}
    product["id"] = row.get("id", "")
    return product


def _score_product(product: dict[str, Any], search: dict[str, Any]) -> int:
    score = 0
    name = _as_str(product.get("name")).lower()
    description = _as_str(product.get("description")).lower()
    category = _as_str(product.get("category")).lower()
    brand = _as_str(product.get("brand")).lower()
    tags = [_as_str(t).lower() for t in product.get("tags", []) if _as_str(t)]
    use_cases = [_as_str(u).lower() for u in product.get("use_cases", []) if _as_str(u)]
    corpus = " ".join([name, description, category, brand, " ".join(tags), " ".join(use_cases)])

    query = _as_str(search.get("query")).lower()
    if query:
        for token in query.split():
            if token in corpus:
                score += 4

    category_key = _as_str(search.get("category")).lower()
    if category_key and category_key in category:
        score += 6

    brand_key = _as_str(search.get("brand")).lower()
    if brand_key and brand_key in brand:
        score += 5

    use_case = _as_str(search.get("use_case")).lower()
    if use_case:
        if any(use_case in uc for uc in use_cases):
            score += 6
        elif use_case in corpus:
            score += 2

    budget_max = _as_float(search.get("budget_max"))
    if budget_max is not None:
        price = _as_float(product.get("price"), default=0.0) or 0.0
        if price <= budget_max:
            score += 5
        else:
            score -= 5

    return score


def _get_or_init_commerce_state(conversation: Conversation) -> dict[str, Any]:
    state = conversation.commerce_state if isinstance(conversation.commerce_state, dict) else {}
    if not isinstance(state.get("preferences"), dict):
        state["preferences"] = {}
    if not isinstance(state.get("last_candidates"), list):
        state["last_candidates"] = []
    if not isinstance(state.get("order_draft"), dict):
        state["order_draft"] = {
            "customer_name": "",
            "email": "",
            "phone": "",
            "address": "",
            "notes": "",
            "currency": "PHP",
            "items": [],
        }
    if "order_verified" not in state:
        state["order_verified"] = False
    state.setdefault("last_order_id", "")
    state.setdefault("last_order_reference", "")
    conversation.commerce_state = state
    return state


def get_tools_for_flow(flow: str) -> list[dict[str, Any]]:
    return COMMERCE_AGENT_TOOLS if flow == "b2c" else SALES_AGENT_TOOLS


def get_tool_runtime_instructions(flow: str) -> str:
    return B2C_TOOL_RUNTIME_INSTRUCTIONS if flow == "b2c" else B2B_TOOL_RUNTIME_INSTRUCTIONS


def infer_tool_calls_from_message(
    *,
    flow: str,
    message: str,
    conversation: Conversation,
) -> list[dict[str, Any]]:
    if flow != "b2c":
        return []

    text = message.lower()
    inferred: list[dict[str, Any]] = []
    state = _get_or_init_commerce_state(conversation)
    prefs = state.get("preferences", {})

    pref_args: dict[str, Any] = {}
    if "laptop" in text:
        pref_args["category"] = "laptop"
    elif "phone" in text or "smartphone" in text:
        pref_args["category"] = "phone"
    elif "tablet" in text:
        pref_args["category"] = "tablet"

    for brand in ["lenovo", "asus", "acer", "dell", "hp", "apple", "samsung", "xiaomi"]:
        if brand in text:
            pref_args["brand_preference"] = brand.title()
            break

    use_case_match = re.search(r"\bfor\s+([a-z0-9\s-]{3,40})", text)
    if use_case_match:
        pref_args["use_case"] = use_case_match.group(1).strip().rstrip(".,!?")

    budget_match = re.search(r"(\d[\d,]{3,})", text)
    if budget_match:
        raw_budget = budget_match.group(1).replace(",", "")
        budget_val = _as_float(raw_budget)
        if budget_val is not None:
            pref_args["budget_max"] = budget_val

    priorities = []
    for priority in ["battery", "keyboard", "camera", "performance", "gaming", "lightweight"]:
        if priority in text:
            priorities.append(priority)
    if priorities:
        pref_args["priorities"] = priorities

    if pref_args:
        inferred.append({"id": f"infer_{uuid.uuid4().hex}", "name": "extract_preferences", "arguments": pref_args})

    needs_compare = any(word in text for word in ["compare", "which is better", "vs", "difference"])
    needs_checkout = any(word in text for word in ["confirm order", "confirmed", "checkout", "place order"])
    selects_product = any(word in text for word in ["i choose", "i'll take", "i will take", "order this", "buy this"])
    asks_options = any(word in text for word in ["top options", "recommend", "suggest", "show options", "what options"])

    has_candidates = bool(_as_str_list(state.get("last_candidates", [])))
    has_pref_context = bool(_as_str(prefs.get("category")) or _as_str(prefs.get("use_case")) or prefs.get("budget_max"))

    if asks_options or (has_pref_context and not has_candidates):
        inferred.append({"id": f"infer_{uuid.uuid4().hex}", "name": "search_products", "arguments": {"limit": 3}})

    if needs_compare:
        inferred.append({"id": f"infer_{uuid.uuid4().hex}", "name": "compare_items", "arguments": {}})

    if selects_product or "name is " in text or "email" in text or "address" in text:
        build_args: dict[str, Any] = {}
        email_match = re.search(r"([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)", message)
        if email_match:
            build_args["email"] = email_match.group(1)

        name_match = re.search(r"name is ([a-zA-Z .'-]{2,60})", message, flags=re.IGNORECASE)
        if name_match:
            build_args["customer_name"] = name_match.group(1).strip().rstrip(".,!?")

        address_match = re.search(r"address(?: is)? ([a-zA-Z0-9, .'-]{4,100})", message, flags=re.IGNORECASE)
        if address_match:
            build_args["address"] = address_match.group(1).strip().rstrip(".,!?")

        phone_match = re.search(r"(\+?\d[\d -]{8,})", message)
        if phone_match:
            build_args["phone"] = phone_match.group(1).strip()

        for token, pid in [
            ("thinkpad", "product::laptop-1"),
            ("vivobook", "product::laptop-2"),
            ("acer", "product::laptop-3"),
        ]:
            if token in text:
                build_args["product_id"] = pid
                break

        if "product_id" not in build_args:
            fallback_candidates = _as_str_list(state.get("last_candidates", []))
            if fallback_candidates:
                build_args["product_id"] = fallback_candidates[0]
        build_args.setdefault("quantity", 1)

        inferred.append({"id": f"infer_{uuid.uuid4().hex}", "name": "build_order", "arguments": build_args})

    if needs_checkout:
        inferred.append({"id": f"infer_{uuid.uuid4().hex}", "name": "verify_order", "arguments": {}})
        inferred.append(
            {
                "id": f"infer_{uuid.uuid4().hex}",
                "name": "checkout_prep",
                "arguments": {"confirmed": True},
            }
        )

    return inferred


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
    preferred_day = _as_str(args.get("preferred_day"))
    preferred_time = _as_str(args.get("preferred_time"))
    timezone_name = _as_str(args.get("timezone")) or "Asia/Manila"
    slot_core = " ".join([part for part in [preferred_day, preferred_time] if part]).strip()
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
    confirmed = _as_bool(args.get("confirmed", False), default=False)
    status = "booked" if confirmed else "proposed"
    slot_text = _build_slot_text(args)
    call_id = f"discovery_call::{uuid.uuid4()}"
    now = _now_iso()
    notes = _as_str(args.get("notes"))

    call_doc = {
        "type": "discovery_call",
        "lead_id": lead_id,
        "conversation_id": conversation_id,
        "slot_start": slot_text,
        "slot_end": None,
        "timezone": _as_str(args.get("timezone")) or "Asia/Manila",
        "status": status,
        "notes": notes,
        "created_at": now,
        "updated_at": now,
    }
    calls_col.insert(call_id, call_doc)

    lead.call_status = status
    lead.call_slot = slot_text
    lead.next_best_action = (
        f"Discovery call booked - {slot_text}" if confirmed else f"Discovery call proposed - {slot_text}"
    )
    lead.updated_at = now

    return {"call_id": call_id, "status": status, "slot": slot_text}


async def _handle_request_pricing_package(
    *,
    args: dict[str, Any],
    lead: Lead,
    conversation: Conversation,
) -> dict[str, Any]:
    reason = _as_str(args.get("reason")) or "Lead requested pricing/package details"
    package_name = _as_str(args.get("package_name"))
    urgency = _as_str(args.get("urgency"))

    lead.asked_for_proposal = True
    _append_unique(conversation.objections, "Wants pricing details first")
    _append_unique(conversation.buying_signals, "Requested pricing package")
    lead.objections = list(conversation.objections)
    lead.buying_signals = list(conversation.buying_signals)

    lead.next_best_action = (
        f"Share pricing for {package_name} and offer discovery call"
        if package_name
        else "Share pricing package details and offer discovery call"
    )
    lead.updated_at = _now_iso()
    conversation.updated_at = _now_iso()

    return {"reason": reason, "package_name": package_name, "urgency": urgency}


async def _handle_escalate_to_human(
    *,
    args: dict[str, Any],
    lead: Lead,
    conversation: Conversation,
) -> dict[str, Any]:
    reason = _as_str(args.get("reason")) or "Human assistance requested"
    priority = _as_str(args.get("priority")).lower() or "normal"
    notes = _as_str(args.get("notes"))
    priority = priority if priority in {"normal", "high", "urgent"} else "normal"

    lead.next_best_action = f"Escalate to human sales rep ({priority}): {reason}"
    lead.updated_at = _now_iso()
    _append_unique(conversation.buying_signals, "Requested human escalation")
    if notes:
        _append_unique(conversation.objections, f"Escalation note: {notes}")
    lead.buying_signals = list(conversation.buying_signals)
    lead.objections = list(conversation.objections)
    conversation.updated_at = _now_iso()

    return {"reason": reason, "priority": priority, "notes": notes}


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
        value = _as_str(args.get(source_key))
        if value:
            setattr(lead, target_field, value)
            changed_fields.append(target_field)

    decision_maker = args.get("decision_maker")
    if isinstance(decision_maker, bool):
        lead.decision_maker = "Yes" if decision_maker else "No"
        changed_fields.append("decision_maker")
    else:
        decision_text = _as_str(decision_maker)
        if decision_text:
            lead.decision_maker = decision_text
            changed_fields.append("decision_maker")

    lead.updated_at = _now_iso()
    return {"changed_fields": changed_fields}


async def _handle_detect_objection(*, args: dict[str, Any], lead: Lead, conversation: Conversation) -> dict[str, Any]:
    objection_type = _as_str(args.get("objection_type"))
    raw_quote = _as_str(args.get("raw_quote"))
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
    return {"lead_score": score, "lead_temperature": temperature}


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


async def _handle_extract_preferences(*, args: dict[str, Any], conversation: Conversation) -> dict[str, Any]:
    state = _get_or_init_commerce_state(conversation)
    prefs = state["preferences"]

    category = _as_str(args.get("category"))
    brand_preference = _as_str(args.get("brand_preference"))
    use_case = _as_str(args.get("use_case"))
    budget_max = _as_float(args.get("budget_max"))
    priorities = _as_str_list(args.get("priorities"))

    if category:
        prefs["category"] = category
    if brand_preference:
        prefs["brand_preference"] = brand_preference
    if use_case:
        prefs["use_case"] = use_case
    if budget_max is not None:
        prefs["budget_max"] = budget_max
    if priorities:
        existing = _as_str_list(prefs.get("priorities", []))
        for item in priorities:
            if item not in existing:
                existing.append(item)
        prefs["priorities"] = existing

    state["preferences"] = prefs
    conversation.commerce_state = state
    conversation.updated_at = _now_iso()
    return {"preferences": prefs}


async def _handle_search_products(
    *,
    args: dict[str, Any],
    conversation: Conversation,
    scope: Any,
) -> dict[str, Any]:
    state = _get_or_init_commerce_state(conversation)
    prefs = state["preferences"]
    search = {
        "query": _as_str(args.get("query")),
        "category": _as_str(args.get("category")) or _as_str(prefs.get("category")),
        "brand": _as_str(args.get("brand")) or _as_str(prefs.get("brand_preference")),
        "use_case": _as_str(args.get("use_case")) or _as_str(prefs.get("use_case")),
        "budget_max": _as_float(args.get("budget_max"), default=_as_float(prefs.get("budget_max"))),
    }
    limit = _as_int(args.get("limit"), default=3)
    if limit < 1:
        limit = 1
    if limit > 10:
        limit = 10

    rows = list(
        scope.query(
            """
            SELECT META(p).id AS id, p.*
            FROM `products` AS p
            LIMIT 200
            """
        )
    )
    products = [_product_from_row(row) for row in rows]
    if not products:
        state["last_candidates"] = []
        conversation.commerce_state = state
        return {"count": 0, "products": []}

    scored: list[tuple[int, dict[str, Any]]] = []
    for product in products:
        score = _score_product(product, search)
        if score > 0:
            scored.append((score, product))

    scored.sort(key=lambda item: item[0], reverse=True)
    if scored:
        top = [item[1] for item in scored[:limit]]
    else:
        top = products[:limit]

    candidate_ids = [_as_str(item.get("id")) for item in top if _as_str(item.get("id"))]
    state["last_candidates"] = candidate_ids
    conversation.commerce_state = state
    conversation.updated_at = _now_iso()

    payload = [
        {
            "id": item.get("id", ""),
            "name": item.get("name", ""),
            "brand": item.get("brand", ""),
            "category": item.get("category", ""),
            "price": item.get("price", 0),
            "currency": item.get("currency", "PHP"),
        }
        for item in top
    ]
    return {"count": len(payload), "products": payload}


async def _handle_compare_items(
    *,
    args: dict[str, Any],
    conversation: Conversation,
    scope: Any,
) -> dict[str, Any]:
    state = _get_or_init_commerce_state(conversation)
    requested = [_normalize_product_id(pid) for pid in _as_str_list(args.get("product_ids", []))]
    candidate_ids = _as_str_list(state.get("last_candidates", []))
    product_ids = requested if requested else candidate_ids[:2]
    if len(product_ids) > 4:
        product_ids = product_ids[:4]

    if not product_ids:
        return {"count": 0, "products": [], "note": "No products selected for comparison."}

    rows = list(
        scope.query(
            """
            SELECT META(p).id AS id, p.*
            FROM `products` AS p
            LIMIT 200
            """
        )
    )
    product_map = {_product_from_row(row).get("id", ""): _product_from_row(row) for row in rows}
    compared = []
    for pid in product_ids:
        product = product_map.get(pid)
        if not product:
            continue
        compared.append(
            {
                "id": product.get("id", ""),
                "sku": product.get("sku", ""),
                "name": product.get("name", ""),
                "brand": product.get("brand", ""),
                "category": product.get("category", ""),
                "price": product.get("price", 0),
                "currency": product.get("currency", "PHP"),
                "specs": product.get("specs", {}),
                "use_cases": product.get("use_cases", []),
            }
        )
    return {"count": len(compared), "products": compared}


async def _handle_build_order(*, args: dict[str, Any], conversation: Conversation) -> dict[str, Any]:
    state = _get_or_init_commerce_state(conversation)
    draft = state["order_draft"]

    customer_name = _as_str(args.get("customer_name"))
    email = _as_str(args.get("email")).lower()
    phone = _as_str(args.get("phone"))
    address = _as_str(args.get("address"))
    notes = _as_str(args.get("notes"))
    product_id = _as_str(args.get("product_id"))
    quantity = _as_int(args.get("quantity"), default=1)
    if quantity <= 0:
        quantity = 1

    if customer_name:
        draft["customer_name"] = customer_name
    if email:
        draft["email"] = email
    if phone:
        draft["phone"] = phone
    if address:
        draft["address"] = address
    if notes:
        draft["notes"] = notes

    if product_id:
        normalized_id = _normalize_product_id(product_id)
        items = draft.get("items", [])
        if not isinstance(items, list):
            items = []
        replaced = False
        for item in items:
            if isinstance(item, dict) and _as_str(item.get("product_id")) == normalized_id:
                item["quantity"] = quantity
                replaced = True
                break
        if not replaced:
            items.append({"product_id": normalized_id, "quantity": quantity})
        draft["items"] = items

    state["order_draft"] = draft
    state["order_verified"] = False
    conversation.commerce_state = state
    conversation.updated_at = _now_iso()

    return {"order_draft": draft, "order_verified": False}


async def _handle_verify_order(*, conversation: Conversation) -> dict[str, Any]:
    state = _get_or_init_commerce_state(conversation)
    draft = state["order_draft"]
    missing_fields: list[str] = []

    for field in ["customer_name", "email", "address"]:
        if not _as_str(draft.get(field)):
            missing_fields.append(field)

    items = draft.get("items")
    if not isinstance(items, list) or len(items) == 0:
        missing_fields.append("items")

    valid = len(missing_fields) == 0
    state["order_verified"] = valid
    conversation.commerce_state = state
    conversation.updated_at = _now_iso()

    summary = {
        "customer_name": _as_str(draft.get("customer_name")),
        "email": _as_str(draft.get("email")),
        "address": _as_str(draft.get("address")),
        "items_count": len(items) if isinstance(items, list) else 0,
    }
    return {"valid": valid, "missing_fields": missing_fields, "summary": summary}


async def _handle_checkout_prep(
    *,
    args: dict[str, Any],
    conversation: Conversation,
    orders_col: Any,
    products_col: Any,
) -> dict[str, Any]:
    state = _get_or_init_commerce_state(conversation)
    draft = state["order_draft"]
    confirmed = _as_bool(args.get("confirmed"), default=True)
    if not confirmed:
        return {"status": "pending_confirmation", "message": "Checkout not finalized yet."}

    verify = await _handle_verify_order(conversation=conversation)
    if not verify.get("valid"):
        return {"status": "invalid_draft", "missing_fields": verify.get("missing_fields", [])}

    order_items = []
    total_amount = 0.0
    for item in draft.get("items", []):
        if not isinstance(item, dict):
            continue
        product_key = _normalize_product_id(_as_str(item.get("product_id")))
        quantity = _as_int(item.get("quantity"), default=1)
        if quantity <= 0:
            quantity = 1

        product_doc = products_col.get(product_key).content_as[dict]
        unit_price = _as_float(product_doc.get("price"), default=0.0) or 0.0
        line_total = unit_price * quantity
        total_amount += line_total
        order_items.append(
            {
                "product_id": product_key,
                "sku": product_doc.get("sku", ""),
                "product_name": product_doc.get("name", ""),
                "quantity": quantity,
                "unit_price": unit_price,
                "line_total": line_total,
            }
        )

    ts = _now_iso()
    order_key = f"order::{uuid.uuid4()}"
    order_doc = {
        "type": "order",
        "customer_name": _as_str(draft.get("customer_name")),
        "email": _as_str(draft.get("email")).lower(),
        "phone": _as_str(draft.get("phone")),
        "address": _as_str(draft.get("address")),
        "items": order_items,
        "amount": round(total_amount, 2),
        "currency": "PHP",
        "status": "awaiting_payment",
        "reference": _build_order_reference(),
        "notes": _as_str(draft.get("notes")),
        "created_at": ts,
        "updated_at": ts,
        "payment_method": _as_str(args.get("payment_method")),
    }
    orders_col.insert(order_key, order_doc)

    state["last_order_id"] = order_key
    state["last_order_reference"] = order_doc["reference"]
    state["order_verified"] = True
    conversation.commerce_state = state
    conversation.updated_at = ts

    response = dict(order_doc)
    response["id"] = order_key
    return {"status": "ready_for_checkout", "order": response}


def _fallback_tool_output(*, canonical_tool: str, lead: Lead, conversation: Conversation, message: str) -> dict[str, Any]:
    if canonical_tool == "generate_follow_up":
        company = lead.company or "your business"
        return {
            "subject": f"Quick follow-up for {company}",
            "body_preview": "Thanks for your time today. Sharing next steps and pricing details shortly.",
            "fallback": True,
            "error": message,
        }
    if canonical_tool == "verify_order":
        return {"valid": False, "missing_fields": ["order_draft"], "fallback": True, "error": message}
    if canonical_tool == "search_products":
        return {"count": 0, "products": [], "fallback": True, "error": message}
    if canonical_tool == "checkout_prep":
        return {"status": "pending", "fallback": True, "error": message}
    if canonical_tool == "schedule_discovery_call":
        return {"status": "proposed", "slot": "TBD (Asia/Manila)", "fallback": True, "error": message}
    return {"status": "fallback_applied", "fallback": True, "error": message}


async def execute_agent_tool_calls(
    *,
    tool_calls: list[dict[str, Any]],
    flow: str,
    lead_id: str,
    conversation_id: str,
    lead: Lead,
    conversation: Conversation,
    scope: Any,
    calls_col: Any,
    products_col: Any,
    orders_col: Any,
) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    fired_events: list[dict[str, Any]] = []
    tool_outputs_for_model: list[dict[str, str]] = []

    for call in tool_calls:
        tool_name = _as_str(call.get("name"))
        if not tool_name:
            continue
        canonical_tool = _normalize_tool_name(tool_name)
        tool_call_id = _as_str(call.get("id")) or f"tool_call_{uuid.uuid4().hex}"
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
            elif canonical_tool == "extract_preferences":
                output = await _handle_extract_preferences(args=args, conversation=conversation)
            elif canonical_tool == "search_products":
                output = await _handle_search_products(args=args, conversation=conversation, scope=scope)
            elif canonical_tool == "compare_items":
                output = await _handle_compare_items(args=args, conversation=conversation, scope=scope)
            elif canonical_tool == "build_order":
                output = await _handle_build_order(args=args, conversation=conversation)
            elif canonical_tool == "verify_order":
                output = await _handle_verify_order(conversation=conversation)
            elif canonical_tool == "checkout_prep":
                output = await _handle_checkout_prep(
                    args=args,
                    conversation=conversation,
                    orders_col=orders_col,
                    products_col=products_col,
                )
            else:
                success = False
                message = f"unsupported_tool: {tool_name}"
                output = _fallback_tool_output(
                    canonical_tool=canonical_tool,
                    lead=lead,
                    conversation=conversation,
                    message=message,
                )
        except Exception as exc:
            success = False
            message = f"tool_execution_failed: {exc}"
            output = _fallback_tool_output(
                canonical_tool=canonical_tool,
                lead=lead,
                conversation=conversation,
                message=message,
            )

        event = _log_tool_activity(
            conversation,
            tool_name=tool_name,
            canonical_tool=canonical_tool,
            args=args,
            success=success,
            message=message,
        )
        event["output"] = output
        event["flow"] = flow
        fired_events.append(event)

        tool_outputs_for_model.append(
            {
                "tool_call_id": tool_call_id,
                "output": json.dumps(output),
            }
        )

    return fired_events, tool_outputs_for_model
