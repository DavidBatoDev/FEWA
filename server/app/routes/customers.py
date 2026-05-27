"""
B2C customers endpoints — parallel to /leads.
"""
import logging

from fastapi import APIRouter, HTTPException
from couchbase.exceptions import DocumentNotFoundException

from app.db.couchbase import get_collection, get_scope
from app.models.customer import CustomerUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("")
async def list_customers():
    try:
        scope = get_scope()
        query = "SELECT META().id AS id, c.* FROM `customers` c ORDER BY c.created_at DESC LIMIT 100"
        rows = []
        for row in scope.query(query):
            if isinstance(row, dict):
                rows.append(row)
        return {"customers": rows}
    except Exception as exc:
        logger.warning("Failed to list customers: %s", exc)
        return {"customers": []}


@router.get("/{customer_id}")
async def get_customer(customer_id: str):
    customers_col = get_collection("customers")
    try:
        result = customers_col.get(customer_id)
        doc = result.content_as[dict]
        doc["id"] = customer_id
    except DocumentNotFoundException:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Attach latest conversation
    doc["conversation"] = None
    doc["order"] = None
    try:
        scope = get_scope()
        conv_query = """
        SELECT META(c).id AS id, c.*
        FROM `conversations` AS c
        WHERE c.lead_id = $cid
        ORDER BY c.updated_at DESC, c.created_at DESC
        LIMIT 1
        """
        for row in scope.query(conv_query, named_parameters={"cid": customer_id}):
            if isinstance(row, dict):
                row["id"] = row.get("id", "")
                doc["conversation"] = row
                break
    except Exception as exc:
        logger.warning("Failed to load customer conversation: %s", exc)

    order_id = doc.get("order_id")
    if order_id:
        try:
            orders_col = get_collection("orders")
            order_doc = orders_col.get(order_id).content_as[dict]
            order_doc["id"] = order_id
            doc["order"] = order_doc
        except Exception:
            pass

    return doc


@router.patch("/{customer_id}")
async def update_customer(customer_id: str, updates: CustomerUpdate):
    customers_col = get_collection("customers")
    try:
        result = customers_col.get(customer_id)
        doc = result.content_as[dict]
    except DocumentNotFoundException:
        raise HTTPException(status_code=404, detail="Customer not found")

    patch = updates.model_dump(exclude_none=True)
    doc.update(patch)
    customers_col.replace(customer_id, doc)
    doc["id"] = customer_id
    return doc
