from typing import Optional
from pydantic import BaseModel


class Product(BaseModel):
    type: str = "product"
    name: str
    brand: str
    category: str = "shoes"
    price: int = 0
    currency: str = "PHP"
    description: str = ""
    sizes: list[str] = []
    image_url: str = ""
    use_cases: list[str] = []
    priorities: list[str] = []
    stock: int = 0
    created_at: str = ""


class ProductResponse(Product):
    id: str
