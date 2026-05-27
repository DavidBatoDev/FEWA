"""
Executes the 6 commerce tools fired by Maya during a B2C shopping conversation.
Mirrors the structure of tool_executor.py (B2B sales).

Customer state lives in the `customers` collection; orders land in `orders`.
Each tool publishes an SSE event via EventBus for the live frontend panel.
"""
import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

from couchbase.exceptions import CouchbaseException

from app.db.couchbase import get_collection
from app.models.conversation import Conversation, TranscriptEntry
from app.models.customer import Customer, Preferences, SelectedProduct
from app.services.checkout import create_order_from_customer
from app.services.event_bus import EventBus
from app.services.product_search import compare_products, get_all_products, get_product, search_products

# In-memory session registry: channel_name → {"customer_id": str, "conversation_id": str}
_sessions: dict[str, dict[str, str]] = {}


def register_session(channel_name: str, customer_id: str, conversation_id: str) -> None:
    _sessions[channel_name] = {"customer_id": customer_id, "conversation_id": conversation_id}


def unregister_session(channel_name: str) -> None:
    _sessions.pop(channel_name, None)


def get_session(channel_name: str) -> dict[str, str] | None:
    return _sessions.get(channel_name)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _elapsed(customer_created_at: str) -> str:
    try:
        created = datetime.fromisoformat(customer_created_at)
        delta = datetime.now(timezone.utc) - created
        total = int(delta.total_seconds())
        return f"{total // 60:02d}:{total % 60:02d}"
    except Exception:
        return "00:00"


async def _get_customer(customer_id: str) -> Customer | None:
    try:
        col = get_collection("customers")
        result = col.get(customer_id)
        return Customer(**result.content_as[dict])
    except CouchbaseException:
        return None


async def _save_customer(customer_id: str, customer: Customer) -> None:
    try:
        col = get_collection("customers")
        customer.updated_at = _now()
        col.upsert(customer_id, customer.model_dump())
    except CouchbaseException as exc:
        logger.warning("Failed to save customer %s: %s", customer_id, exc)


async def run(tool_name: str, arguments: str | dict, channel_name: str) -> dict:
    args = arguments if isinstance(arguments, dict) else json.loads(arguments)
    session = get_session(channel_name)
    customer_id = session["customer_id"] if session else f"customer::{uuid.uuid4()}"

    logger.info(
        "Commerce tool executor: tool=%r  channel=%r  session_found=%s  customer_id=%r",
        tool_name, channel_name, bool(session), customer_id,
    )

    handler = _HANDLERS.get(tool_name)
    if handler is None:
        logger.warning("Unknown commerce tool requested: %r", tool_name)
        return {"ok": False, "error": f"Unknown tool: {tool_name}"}

    result = await handler(args, customer_id, channel_name)
    logger.info("Commerce tool %r completed: %s", tool_name, json.dumps(result, default=str)[:300])
    return result


async def _handle_list_all_products(args: dict, customer_id: str, channel: str) -> dict:
    customer = await _get_customer(customer_id) or Customer(created_at=_now(), updated_at=_now())
    products = await get_all_products()

    event = {
        "tool": "list_all_products",
        "timestamp": _elapsed(customer.created_at),
        "data": {
            "results": [
                {
                    "id": p.get("id"),
                    "name": p.get("name"),
                    "brand": p.get("brand"),
                    "price": p.get("price"),
                    "currency": p.get("currency", "PHP"),
                    "description": p.get("description", ""),
                    "image_url": p.get("image_url"),
                    "use_cases": p.get("use_cases", []),
                }
                for p in products
            ]
        },
    }
    await asyncio.gather(_save_customer(customer_id, customer), EventBus.publish(channel, event))
    return {"ok": True, "count": len(products), "products": event["data"]["results"]}


async def _handle_no_op(args: dict, customer_id: str, channel: str) -> dict:
    return {"ok": True}


async def _handle_extract_preferences(args: dict, customer_id: str, channel: str) -> dict:
    customer = await _get_customer(customer_id) or Customer(created_at=_now(), updated_at=_now())

    updated_fields: dict[str, object] = {}

    contact_name = args.get("contact_name")
    if contact_name:
        customer.name = str(contact_name)
        updated_fields["name"] = customer.name

    prefs = customer.preferences or Preferences()
    for key in ("category", "size", "brand", "use_case"):
        val = args.get(key)
        if val:
            setattr(prefs, key, str(val))
            updated_fields[key] = str(val)
    if args.get("budget") is not None:
        try:
            prefs.budget = int(args["budget"])
            updated_fields["budget"] = prefs.budget
        except (TypeError, ValueError):
            pass
    if isinstance(args.get("priorities"), list):
        cleaned = [str(p) for p in args["priorities"] if p]
        if cleaned:
            prefs.priorities = list(dict.fromkeys((prefs.priorities or []) + cleaned))
            updated_fields["priorities"] = prefs.priorities
    customer.preferences = prefs

    event = {
        "tool": "extract_preferences",
        "timestamp": _elapsed(customer.created_at),
        "data": updated_fields,
    }
    await asyncio.gather(_save_customer(customer_id, customer), EventBus.publish(channel, event))
    return {"ok": True, "updated_fields": updated_fields}


async def _handle_search_products(args: dict, customer_id: str, channel: str) -> dict:
    customer = await _get_customer(customer_id) or Customer(created_at=_now(), updated_at=_now())

    use_case = args.get("use_case") or (customer.preferences and customer.preferences.use_case)
    budget = args.get("budget") or (customer.preferences and customer.preferences.budget)
    brand = args.get("brand") or (customer.preferences and customer.preferences.brand)
    priorities = args.get("priorities") or (customer.preferences and customer.preferences.priorities) or []
    limit = int(args.get("limit") or 3)

    products = await search_products(
        use_case=use_case,
        budget=budget,
        brand=brand,
        priorities=priorities,
        limit=limit,
    )

    # Track viewed product IDs on the customer
    viewed = customer.viewed_products or []
    for p in products:
        pid = p.get("id")
        if pid and pid not in viewed:
            viewed.append(pid)
    customer.viewed_products = viewed
    if customer.status == "browsing":
        customer.status = "comparing" if len(products) > 1 else customer.status

    event = {
        "tool": "search_products",
        "timestamp": _elapsed(customer.created_at),
        "data": {
            "use_case": use_case,
            "budget": budget,
            "brand": brand,
            "results": [
                {
                    "id": p.get("id"),
                    "name": p.get("name"),
                    "brand": p.get("brand"),
                    "price": p.get("price"),
                    "currency": p.get("currency", "PHP"),
                    "description": p.get("description", ""),
                    "image_url": p.get("image_url"),
                    "match_reason": p.get("match_reason"),
                    "use_cases": p.get("use_cases", []),
                }
                for p in products
            ],
        },
    }
    await asyncio.gather(_save_customer(customer_id, customer), EventBus.publish(channel, event))
    return {"ok": True, "count": len(products), "products": event["data"]["results"]}


async def _handle_compare_items(args: dict, customer_id: str, channel: str) -> dict:
    customer = await _get_customer(customer_id) or Customer(created_at=_now(), updated_at=_now())

    a_id = args.get("product_a_id")
    b_id = args.get("product_b_id")
    context = args.get("context", "")
    if not a_id or not b_id:
        return {"ok": False, "error": "Need both product_a_id and product_b_id"}

    comparison = await compare_products(a_id, b_id, context)
    if not comparison.get("ok"):
        return comparison

    pair = sorted([a_id, b_id])
    if pair not in (customer.comparison_pairs or []):
        customer.comparison_pairs = (customer.comparison_pairs or []) + [pair]

    event = {
        "tool": "compare_items",
        "timestamp": _elapsed(customer.created_at),
        "data": {
            "context": context,
            "a": comparison["a"],
            "b": comparison["b"],
        },
    }
    await asyncio.gather(_save_customer(customer_id, customer), EventBus.publish(channel, event))
    return {"ok": True, "comparison": event["data"]}


async def _handle_build_order(args: dict, customer_id: str, channel: str) -> dict:
    customer = await _get_customer(customer_id) or Customer(created_at=_now(), updated_at=_now())

    product_id = args.get("product_id")
    if not product_id:
        return {"ok": False, "error": "product_id is required"}

    # Resolve product details if not provided
    name = args.get("product_name")
    brand = args.get("brand")
    unit_price = args.get("unit_price")
    if not (name and unit_price):
        product = await get_product(product_id)
        if product:
            name = name or product.get("name")
            brand = brand or product.get("brand")
            unit_price = unit_price or product.get("price")

    quantity = int(args.get("quantity") or 1)
    customer.selected_product = SelectedProduct(
        product_id=product_id,
        name=str(name or product_id),
        brand=str(brand) if brand else None,
        unit_price=int(unit_price or 0),
        quantity=max(1, quantity),
    )

    customer_name = args.get("customer_name")
    if customer_name:
        customer.name = str(customer_name)
    delivery_address = args.get("delivery_address")
    if delivery_address:
        customer.delivery_address = str(delivery_address)
    phone = args.get("phone")
    if phone:
        customer.phone = str(phone)
    email = args.get("email")
    if email:
        customer.email = str(email)

    customer.status = "ordering"

    form_state = {
        "product_id": product_id,
        "product_name": customer.selected_product.name,
        "brand": customer.selected_product.brand,
        "unit_price": customer.selected_product.unit_price,
        "quantity": customer.selected_product.quantity,
        "customer_name": customer.name,
        "delivery_address": customer.delivery_address,
        "phone": customer.phone,
        "email": customer.email,
    }

    event = {
        "tool": "build_order",
        "timestamp": _elapsed(customer.created_at),
        "data": form_state,
    }
    await asyncio.gather(_save_customer(customer_id, customer), EventBus.publish(channel, event))
    return {"ok": True, "order_form": form_state}


async def _handle_verify_order(args: dict, customer_id: str, channel: str) -> dict:
    customer = await _get_customer(customer_id) or Customer(created_at=_now(), updated_at=_now())

    if not customer.selected_product:
        return {"ok": False, "error": "No product selected yet"}

    sp = customer.selected_product
    total = sp.unit_price * sp.quantity
    summary = args.get("summary") or (
        f"{sp.name} at ₱{sp.unit_price:,}, quantity {sp.quantity}, "
        f"delivered to {customer.name or 'customer'} at {customer.delivery_address or 'address pending'}."
    )

    customer.status = "verified"

    event = {
        "tool": "verify_order",
        "timestamp": _elapsed(customer.created_at),
        "data": {
            "summary": summary,
            "product_id": sp.product_id,
            "product_name": sp.name,
            "brand": sp.brand,
            "unit_price": sp.unit_price,
            "quantity": sp.quantity,
            "total_amount": total,
            "currency": "PHP",
            "customer_name": customer.name,
            "delivery_address": customer.delivery_address,
            "phone": customer.phone,
        },
    }
    await asyncio.gather(_save_customer(customer_id, customer), EventBus.publish(channel, event))
    return {"ok": True, "summary": summary, "total_amount": total}


async def _handle_checkout_prep(args: dict, customer_id: str, channel: str) -> dict:
    customer = await _get_customer(customer_id) or Customer(created_at=_now(), updated_at=_now())

    if not customer.selected_product:
        return {"ok": False, "error": "No product selected yet"}

    payment_method = str(args.get("payment_method") or "cod").lower()
    notes = args.get("notes")

    try:
        order_id, order = await create_order_from_customer(
            customer_id=customer_id,
            customer=customer,
            payment_method=payment_method,
            notes=notes,
        )
    except Exception as exc:
        logger.exception("Failed to create order for %s", customer_id)
        return {"ok": False, "error": str(exc)}

    customer.order_id = order_id
    customer.order_reference = order.reference
    customer.status = "checkout_ready"

    event = {
        "tool": "checkout_prep",
        "timestamp": _elapsed(customer.created_at),
        "data": {
            "order_id": order_id,
            "reference": order.reference,
            "product_name": order.product_name,
            "brand": order.brand,
            "unit_price": order.unit_price,
            "quantity": order.quantity,
            "total_amount": order.total_amount,
            "currency": order.currency,
            "payment_method": order.payment_method,
            "delivery_name": order.delivery.name,
            "delivery_address": order.delivery.address,
        },
    }
    await asyncio.gather(_save_customer(customer_id, customer), EventBus.publish(channel, event))
    return {
        "ok": True,
        "order_id": order_id,
        "reference": order.reference,
        "total_amount": order.total_amount,
    }


async def _get_conversation(conversation_id: str) -> Conversation | None:
    try:
        col = get_collection("conversations")
        result = col.get(conversation_id)
        return Conversation(**result.content_as[dict])
    except CouchbaseException:
        return None


async def _save_conversation(conversation_id: str, conv: Conversation) -> None:
    try:
        col = get_collection("conversations")
        conv.updated_at = _now()
        col.upsert(conversation_id, conv.model_dump())
    except CouchbaseException:
        pass


async def _run_summary(conversation_id: str, customer_id: str, channel: str, transcript: list[TranscriptEntry]) -> None:
    """Generate an OpenAI summary from the transcript and persist it asynchronously."""
    try:
        from app.services.commerce_agent import generate_commerce_summary

        summary = await generate_commerce_summary(transcript)
        if not summary:
            return

        conv = await _get_conversation(conversation_id)
        if conv:
            conv.summary = summary
            await _save_conversation(conversation_id, conv)

        customer = await _get_customer(customer_id)
        if customer:
            customer.conversation_summary = summary
            await _save_customer(customer_id, customer)

        await EventBus.publish(channel, {
            "tool": "summary_updated",
            "timestamp": _elapsed(customer.created_at) if customer else "00:00",
            "data": {"summary": summary[:300]},
        })
        logger.info("Commerce summary saved for channel=%r  len=%d", channel, len(summary))
    except Exception:
        logger.exception("Background commerce summary failed for channel=%r", channel)


async def save_transcript_turn(channel: str, user_text: str, assistant_text: str) -> None:
    session = get_session(channel)
    if not session:
        logger.warning("commerce save_transcript_turn: no session for channel=%r", channel)
        return

    conversation_id = session["conversation_id"]
    customer_id = session["customer_id"]

    conv = await _get_conversation(conversation_id)
    if conv is None:
        conv = Conversation(lead_id=customer_id, created_at=_now(), updated_at=_now())

    ts = _now()
    if user_text:
        conv.transcript.append(TranscriptEntry(role="user", message=user_text, timestamp=ts))
    if assistant_text:
        conv.transcript.append(TranscriptEntry(role="assistant", message=assistant_text, timestamp=ts))

    await _save_conversation(conversation_id, conv)

    total = len(conv.transcript)
    logger.info("Commerce transcript saved: channel=%r  total_entries=%d", channel, total)

    if total > 0 and total % 8 == 0:
        asyncio.create_task(_run_summary(conversation_id, customer_id, channel, list(conv.transcript)))


_HANDLERS = {
    "list_all_products": _handle_list_all_products,
    "no_op": _handle_no_op,
    "extract_preferences": _handle_extract_preferences,
    "search_products": _handle_search_products,
    "compare_items": _handle_compare_items,
    "build_order": _handle_build_order,
    "verify_order": _handle_verify_order,
    "checkout_prep": _handle_checkout_prep,
}
