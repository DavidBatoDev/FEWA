from typing import Literal, Optional
from pydantic import BaseModel

CustomerStatus = Literal[
    "browsing",
    "comparing",
    "ordering",
    "verified",
    "checkout_ready",
    "abandoned",
]


class Preferences(BaseModel):
    category: Optional[str] = None
    budget: Optional[int] = None
    size: Optional[str] = None
    brand: Optional[str] = None
    use_case: Optional[str] = None
    priorities: list[str] = []


class SelectedProduct(BaseModel):
    product_id: str
    name: str
    brand: Optional[str] = None
    unit_price: int = 0
    quantity: int = 1


class Customer(BaseModel):
    type: str = "customer"
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    delivery_address: Optional[str] = None
    preferences: Preferences = Preferences()
    viewed_products: list[str] = []
    comparison_pairs: list[list[str]] = []
    selected_product: Optional[SelectedProduct] = None
    order_reference: Optional[str] = None
    order_id: Optional[str] = None
    status: CustomerStatus = "browsing"
    conversation_summary: Optional[str] = None
    created_at: str = ""
    updated_at: str = ""


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    delivery_address: Optional[str] = None
    preferences: Optional[Preferences] = None
    status: Optional[CustomerStatus] = None


class CustomerResponse(Customer):
    id: str
