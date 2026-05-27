import re
import uuid
from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.db.couchbase import get_collection, get_scope

router = APIRouter(prefix="/orders", tags=["orders"])

ORDER_STATUSES = {"awaiting_payment", "paid", "processing", "shipped", "completed", "cancelled"}


class OrderCreateItemRequest(BaseModel):
    product_id: str
    quantity: int = 1


class OrderCreateRequest(BaseModel):
    customer_name: str
    email: str
    phone: str = ""
    address: str
    items: list[OrderCreateItemRequest]
    notes: str = ""


class OrderUpdateRequest(BaseModel):
    status: Literal["awaiting_payment", "paid", "processing", "shipped", "completed", "cancelled"] | None = None
    notes: str | None = None


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize_product_id(product_id: str) -> str:
    clean = product_id.strip()
    if clean.startswith("product::"):
        return clean
    return f"product::{clean}"


def _normalize_order_id(order_id: str) -> str:
    clean = order_id.strip()
    if clean.startswith("order::"):
        return clean
    return f"order::{clean}"


def _build_order_reference() -> str:
    year = datetime.now(timezone.utc).year
    suffix = uuid.uuid4().hex[:6].upper()
    return f"WPH-{year}-{suffix}"


def _extract_order_id(order_key: str) -> str:
    return order_key[len("order::") :] if order_key.startswith("order::") else order_key


@router.post("")
async def create_order(payload: OrderCreateRequest):
    customer_name = payload.customer_name.strip()
    email = payload.email.strip().lower()
    address = payload.address.strip()
    if not customer_name:
        raise HTTPException(status_code=400, detail="customer_name is required")
    if not email or not re.fullmatch(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise HTTPException(status_code=400, detail="email must be a valid email address")
    if not address:
        raise HTTPException(status_code=400, detail="address is required")
    if not payload.items:
        raise HTTPException(status_code=400, detail="items must include at least one product")

    products_col = get_collection("products")
    order_items = []
    total_amount = 0.0

    for item in payload.items:
        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail="quantity must be greater than 0")
        product_key = _normalize_product_id(item.product_id)
        try:
            product_doc = products_col.get(product_key).content_as[dict]
        except Exception:
            raise HTTPException(status_code=404, detail=f"Product not found: {product_key}")

        unit_price = float(product_doc.get("price") or 0)
        line_total = unit_price * item.quantity
        total_amount += line_total
        order_items.append(
            {
                "product_id": product_key,
                "sku": product_doc.get("sku", ""),
                "product_name": product_doc.get("name", ""),
                "quantity": item.quantity,
                "unit_price": unit_price,
                "line_total": line_total,
            }
        )

    ts = _now_iso()
    order_key = f"order::{uuid.uuid4()}"
    order_doc = {
        "type": "order",
        "customer_name": customer_name,
        "email": email,
        "phone": payload.phone.strip(),
        "address": address,
        "items": order_items,
        "amount": round(total_amount, 2),
        "currency": "PHP",
        "status": "awaiting_payment",
        "reference": _build_order_reference(),
        "notes": payload.notes.strip(),
        "created_at": ts,
        "updated_at": ts,
    }

    orders_col = get_collection("orders")
    try:
        orders_col.insert(order_key, order_doc)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Couchbase error: {exc}") from exc

    response = dict(order_doc)
    response["id"] = _extract_order_id(order_key)
    return response


@router.get("")
async def list_orders(
    status: str | None = None,
    limit: int = Query(default=100, ge=1, le=200),
):
    scope = get_scope()
    if status:
        status_key = status.strip().lower()
        if status_key not in ORDER_STATUSES:
            raise HTTPException(status_code=400, detail=f"status must be one of: {', '.join(sorted(ORDER_STATUSES))}")
        rows = list(
            scope.query(
                """
                SELECT META(o).id AS id, o.*
                FROM `orders` AS o
                WHERE o.status = $status
                ORDER BY o.created_at DESC
                LIMIT $limit
                """,
                named_parameters={"status": status_key, "limit": limit},
            )
        )
    else:
        rows = list(
            scope.query(
                """
                SELECT META(o).id AS id, o.*
                FROM `orders` AS o
                ORDER BY o.created_at DESC
                LIMIT $limit
                """,
                named_parameters={"limit": limit},
            )
        )

    orders = []
    for row in rows:
        doc = {k: v for k, v in row.items() if k != "id"}
        doc["id"] = _extract_order_id(row.get("id", ""))
        orders.append(doc)
    return {"orders": orders}


@router.get("/{order_id}")
async def get_order(order_id: str):
    orders_col = get_collection("orders")
    order_key = _normalize_order_id(order_id)
    try:
        order_doc = orders_col.get(order_key).content_as[dict]
    except Exception:
        raise HTTPException(status_code=404, detail="Order not found")

    response = dict(order_doc)
    response["id"] = _extract_order_id(order_key)
    return response


@router.patch("/{order_id}")
async def update_order(order_id: str, payload: OrderUpdateRequest):
    order_key = _normalize_order_id(order_id)
    orders_col = get_collection("orders")
    try:
        order_doc = orders_col.get(order_key).content_as[dict]
    except Exception:
        raise HTTPException(status_code=404, detail="Order not found")

    if payload.status is not None:
        status_key = payload.status.strip().lower()
        if status_key not in ORDER_STATUSES:
            raise HTTPException(status_code=400, detail=f"status must be one of: {', '.join(sorted(ORDER_STATUSES))}")
        order_doc["status"] = status_key
    if payload.notes is not None:
        order_doc["notes"] = payload.notes.strip()

    order_doc["updated_at"] = _now_iso()
    try:
        orders_col.replace(order_key, order_doc)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Couchbase error: {exc}") from exc

    response = dict(order_doc)
    response["id"] = _extract_order_id(order_key)
    return response
