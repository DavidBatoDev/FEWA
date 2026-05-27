from typing import Literal

from pydantic import BaseModel

OrderStatus = Literal["awaiting_payment", "paid", "processing", "shipped", "completed", "cancelled"]


class OrderItem(BaseModel):
    product_id: str
    sku: str
    product_name: str
    quantity: int
    unit_price: float
    line_total: float


class Order(BaseModel):
    type: str = "order"
    customer_name: str
    email: str
    phone: str = ""
    address: str
    items: list[OrderItem]
    amount: float
    currency: str = "PHP"
    status: OrderStatus = "awaiting_payment"
    reference: str
    notes: str = ""
    created_at: str = ""
    updated_at: str = ""
