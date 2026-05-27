"""
B2C orders endpoints — list/get/update orders created by the Commerce Agent.
"""
import logging

from fastapi import APIRouter, HTTPException
from couchbase.exceptions import DocumentNotFoundException

from app.db.couchbase import get_collection, get_scope
from app.models.order import OrderUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("")
async def list_orders():
    try:
        scope = get_scope()
        query = "SELECT META().id AS id, o.* FROM `orders` o ORDER BY o.created_at DESC LIMIT 100"
        rows = []
        for row in scope.query(query):
            if isinstance(row, dict):
                rows.append(row)
        return {"orders": rows}
    except Exception as exc:
        logger.warning("Failed to list orders: %s", exc)
        return {"orders": []}


@router.get("/{order_id}")
async def get_order(order_id: str):
    orders_col = get_collection("orders")
    try:
        result = orders_col.get(order_id)
        doc = result.content_as[dict]
        doc["id"] = order_id
        return doc
    except DocumentNotFoundException:
        raise HTTPException(status_code=404, detail="Order not found")


@router.patch("/{order_id}")
async def update_order(order_id: str, updates: OrderUpdate):
    orders_col = get_collection("orders")
    try:
        result = orders_col.get(order_id)
        doc = result.content_as[dict]
    except DocumentNotFoundException:
        raise HTTPException(status_code=404, detail="Order not found")

    patch = updates.model_dump(exclude_none=True)
    doc.update(patch)
    orders_col.replace(order_id, doc)
    doc["id"] = order_id
    return doc
