"""
B2C product catalog endpoints.
"""
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db.couchbase import get_collection, get_scope
from app.services.product_search import compare_products, get_product, search_products

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/products", tags=["products"])


class SearchRequest(BaseModel):
    use_case: Optional[str] = None
    budget: Optional[int] = None
    brand: Optional[str] = None
    priorities: Optional[list[str]] = None
    limit: int = 3


class CompareRequest(BaseModel):
    product_a_id: str
    product_b_id: str
    context: str = ""


@router.get("")
async def list_products():
    try:
        scope = get_scope()
        query = "SELECT META().id AS id, p.* FROM `products` p ORDER BY p.price ASC LIMIT 100"
        rows = []
        for row in scope.query(query):
            if isinstance(row, dict):
                rows.append(row)
        return {"products": rows}
    except Exception as exc:
        logger.warning("Failed to list products: %s", exc)
        return {"products": []}


@router.get("/{product_id}")
async def get_product_endpoint(product_id: str):
    product = await get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("/search")
async def search_endpoint(req: SearchRequest):
    products = await search_products(
        use_case=req.use_case,
        budget=req.budget,
        brand=req.brand,
        priorities=req.priorities,
        limit=req.limit,
    )
    return {"products": products}


@router.post("/compare")
async def compare_endpoint(req: CompareRequest):
    result = await compare_products(req.product_a_id, req.product_b_id, req.context)
    if not result.get("ok"):
        raise HTTPException(status_code=404, detail=result.get("error", "Comparison failed"))
    return result
