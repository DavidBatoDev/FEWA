"""
Checkout helpers — order reference generation and order document creation.
"""
import logging
import random
import uuid
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

from couchbase.exceptions import CouchbaseException

from app.db.couchbase import get_collection
from app.models.customer import Customer
from app.models.order import Order, OrderDelivery


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def generate_reference() -> str:
    """Generate a checkout reference like FFPH-2026-00142."""
    year = datetime.now(timezone.utc).year
    return f"FFPH-{year}-{random.randint(10000, 99999)}"


async def create_order_from_customer(
    customer_id: str,
    customer: Customer,
    payment_method: str = "cod",
    notes: Optional[str] = None,
) -> tuple[str, Order]:
    """Write a new order document based on the customer's selected product
    and delivery info. Returns (order_id, order_doc)."""
    if not customer.selected_product:
        raise ValueError("Customer has no selected product")

    sp = customer.selected_product
    order_id = f"order::{uuid.uuid4()}"
    reference = generate_reference()
    total = sp.unit_price * sp.quantity

    order = Order(
        customer_id=customer_id,
        reference=reference,
        product_id=sp.product_id,
        product_name=sp.name,
        brand=sp.brand,
        unit_price=sp.unit_price,
        quantity=sp.quantity,
        total_amount=total,
        delivery=OrderDelivery(
            name=customer.name,
            phone=customer.phone,
            address=customer.delivery_address,
        ),
        payment_method=payment_method,
        payment_status="awaiting_payment",
        notes=notes,
        created_at=_now_iso(),
        updated_at=_now_iso(),
    )

    try:
        orders_col = get_collection("orders")
        orders_col.insert(order_id, order.model_dump())
    except CouchbaseException as exc:
        logger.warning("Failed to insert order %s: %s", order_id, exc)
        raise

    return order_id, order
