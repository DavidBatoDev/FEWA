from typing import Literal, Optional
from pydantic import BaseModel

PaymentStatus = Literal["awaiting_payment", "paid", "cancelled"]


class OrderDelivery(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class Order(BaseModel):
    type: str = "order"
    customer_id: str
    reference: str
    product_id: str
    product_name: str
    brand: Optional[str] = None
    unit_price: int = 0
    quantity: int = 1
    total_amount: int = 0
    currency: str = "PHP"
    delivery: OrderDelivery = OrderDelivery()
    payment_method: Optional[str] = None
    payment_status: PaymentStatus = "awaiting_payment"
    notes: Optional[str] = None
    created_at: str = ""
    updated_at: str = ""


class OrderUpdate(BaseModel):
    payment_status: Optional[PaymentStatus] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None


class OrderResponse(Order):
    id: str
