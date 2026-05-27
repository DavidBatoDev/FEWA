from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.db.couchbase import get_scope

router = APIRouter(prefix="/products", tags=["products"])


class ProductSearchRequest(BaseModel):
    query: str = ""
    category: str = ""
    brand: str = ""
    use_case: str = ""
    budget_max: float | None = None
    limit: int = 3


class ProductCompareRequest(BaseModel):
    product_ids: list[str]


def _product_from_row(row: dict) -> dict:
    product = {k: v for k, v in row.items() if k != "id"}
    product["id"] = row.get("id", "")
    return product


def _normalize_product_id(product_id: str) -> str:
    clean = product_id.strip()
    if clean.startswith("product::"):
        return clean
    return f"product::{clean}"


def _score_product(product: dict, req: ProductSearchRequest) -> int:
    score = 0
    name = str(product.get("name", "")).lower()
    description = str(product.get("description", "")).lower()
    category = str(product.get("category", "")).lower()
    brand = str(product.get("brand", "")).lower()
    tags = [str(t).lower() for t in (product.get("tags") or [])]
    use_cases = [str(u).lower() for u in (product.get("use_cases") or [])]
    corpus = " ".join([name, description, category, brand, " ".join(tags), " ".join(use_cases)])

    if req.query.strip():
        for token in req.query.lower().split():
            if token in corpus:
                score += 4

    if req.category.strip() and req.category.lower() in category:
        score += 6

    if req.brand.strip() and req.brand.lower() in brand:
        score += 5

    if req.use_case.strip():
        use_case_val = req.use_case.lower()
        if any(use_case_val in uc for uc in use_cases):
            score += 6
        elif use_case_val in corpus:
            score += 2

    if req.budget_max is not None:
        price = float(product.get("price") or 0)
        if price <= req.budget_max:
            score += 5
        else:
            score -= 5

    return score


@router.get("")
async def list_products(
    category: str | None = None,
    brand: str | None = None,
    limit: int = Query(default=50, ge=1, le=200),
):
    scope = get_scope()
    rows = list(
        scope.query(
            """
            SELECT META(p).id AS id, p.*
            FROM `products` AS p
            ORDER BY p.created_at DESC
            LIMIT $limit
            """,
            named_parameters={"limit": limit},
        )
    )
    products = [_product_from_row(row) for row in rows]

    if category:
        category_key = category.strip().lower()
        products = [p for p in products if category_key in str(p.get("category", "")).lower()]
    if brand:
        brand_key = brand.strip().lower()
        products = [p for p in products if brand_key in str(p.get("brand", "")).lower()]

    return {"products": products}


@router.post("/search")
async def search_products(payload: ProductSearchRequest):
    scope = get_scope()
    rows = list(
        scope.query(
            """
            SELECT META(p).id AS id, p.*
            FROM `products` AS p
            LIMIT 200
            """
        )
    )
    products = [_product_from_row(row) for row in rows]
    if not products:
        return {"products": [], "count": 0}

    limit = max(1, min(payload.limit, 20))
    scored: list[tuple[int, dict]] = []
    for product in products:
        score = _score_product(product, payload)
        if score > 0:
            scored.append((score, product))

    scored.sort(key=lambda item: item[0], reverse=True)
    top = [item[1] for item in scored[:limit]]
    return {"products": top, "count": len(top)}


@router.post("/compare")
async def compare_products(payload: ProductCompareRequest):
    if len(payload.product_ids) < 2:
        raise HTTPException(status_code=400, detail="product_ids must include at least 2 items")
    if len(payload.product_ids) > 4:
        raise HTTPException(status_code=400, detail="product_ids supports up to 4 items")

    normalized_ids = [_normalize_product_id(pid) for pid in payload.product_ids]
    scope = get_scope()
    rows = list(
        scope.query(
            """
            SELECT META(p).id AS id, p.*
            FROM `products` AS p
            WHERE META(p).id IN $ids
            """,
            named_parameters={"ids": normalized_ids},
        )
    )
    found = {_product_from_row(row)["id"]: _product_from_row(row) for row in rows}
    missing = [pid for pid in normalized_ids if pid not in found]
    if missing:
        raise HTTPException(status_code=404, detail=f"Products not found: {', '.join(missing)}")

    compared = []
    for pid in normalized_ids:
        product = found[pid]
        compared.append(
            {
                "id": product.get("id"),
                "sku": product.get("sku"),
                "name": product.get("name"),
                "brand": product.get("brand"),
                "category": product.get("category"),
                "price": product.get("price"),
                "currency": product.get("currency", "PHP"),
                "specs": product.get("specs", {}),
                "use_cases": product.get("use_cases", []),
            }
        )

    return {"products": compared}
