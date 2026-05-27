from pydantic import BaseModel


class Product(BaseModel):
    type: str = "product"
    sku: str
    name: str
    category: str
    brand: str
    price: float
    currency: str = "PHP"
    description: str = ""
    specs: dict = {}
    tags: list[str] = []
    use_cases: list[str] = []
    stock: int = 0
    created_at: str = ""
    updated_at: str = ""
