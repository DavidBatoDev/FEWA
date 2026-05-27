"""
Simple keyword + budget ranking against the `products` Couchbase collection.
Used by the `search_products` and `compare_items` commerce tools.
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)

from couchbase.exceptions import CouchbaseException

from app.config import settings
from app.db.couchbase import get_cluster, get_collection
from app.models.product import Product


def _score_product(p: dict, use_case: Optional[str], budget: Optional[int],
                   brand: Optional[str], priorities: Optional[list[str]]) -> int:
    score = 0
    if use_case and use_case.lower() in [u.lower() for u in p.get("use_cases", [])]:
        score += 30
    if brand and brand.lower() == str(p.get("brand", "")).lower():
        score += 20
    if budget:
        price = int(p.get("price", 0) or 0)
        if price <= budget:
            score += 25
            # Closer to budget ceiling = better value match
            score += max(0, 10 - int((budget - price) / max(budget, 1) * 10))
        else:
            score -= 30  # over budget — heavy penalty
    if priorities:
        prod_priorities = [pp.lower() for pp in p.get("priorities", [])]
        for pr in priorities:
            if pr.lower() in prod_priorities:
                score += 5
    return score


async def search_products(
    use_case: Optional[str] = None,
    budget: Optional[int] = None,
    brand: Optional[str] = None,
    priorities: Optional[list[str]] = None,
    limit: int = 3,
) -> list[dict]:
    """Return the top N products matching the given preferences. Each item is the
    product document with an injected `id` field and a `match_reason` string."""
    products = await _load_all_products()
    if not products:
        return []

    ranked = sorted(
        products,
        key=lambda p: _score_product(p, use_case, budget, brand, priorities),
        reverse=True,
    )
    top = ranked[: max(1, limit)]

    def _reason(p: dict) -> str:
        bits: list[str] = []
        if use_case and use_case.lower() in [u.lower() for u in p.get("use_cases", [])]:
            bits.append(f"great for {use_case}")
        if budget and int(p.get("price", 0)) <= budget:
            bits.append(f"within ₱{budget:,} budget")
        if priorities:
            prod_priorities = [pp.lower() for pp in p.get("priorities", [])]
            hits = [pr for pr in priorities if pr.lower() in prod_priorities]
            if hits:
                bits.append("strong on " + ", ".join(hits))
        if brand and brand.lower() == str(p.get("brand", "")).lower():
            bits.append(f"matches brand preference ({brand})")
        return "; ".join(bits) or "good overall match"

    for p in top:
        p["match_reason"] = _reason(p)
    return top


async def get_product(product_id: str) -> Optional[dict]:
    try:
        col = get_collection("products")
        result = col.get(product_id)
        doc = result.content_as[dict]
        doc["id"] = product_id
        return doc
    except CouchbaseException:
        return None


async def compare_products(product_a_id: str, product_b_id: str, context: str = "") -> dict:
    a = await get_product(product_a_id)
    b = await get_product(product_b_id)
    if not a or not b:
        return {"ok": False, "error": "One or both products not found"}

    def _pros(p: dict) -> list[str]:
        pros: list[str] = []
        if "cushioning" in [x.lower() for x in p.get("priorities", [])]:
            pros.append("excellent cushioning")
        if "lightweight" in [x.lower() for x in p.get("priorities", [])]:
            pros.append("lightweight build")
        if "durability" in [x.lower() for x in p.get("priorities", [])]:
            pros.append("durable construction")
        if "style" in [x.lower() for x in p.get("priorities", [])]:
            pros.append("strong style appeal")
        if "comfort" in [x.lower() for x in p.get("priorities", [])]:
            pros.append("comfortable for long wear")
        if int(p.get("price", 0)) < 5000:
            pros.append("great value pricing")
        return pros or ["solid all-rounder"]

    return {
        "ok": True,
        "context": context,
        "a": {
            "id": product_a_id,
            "name": a.get("name"),
            "brand": a.get("brand"),
            "price": a.get("price"),
            "image_url": a.get("image_url"),
            "use_cases": a.get("use_cases", []),
            "pros": _pros(a),
        },
        "b": {
            "id": product_b_id,
            "name": b.get("name"),
            "brand": b.get("brand"),
            "price": b.get("price"),
            "image_url": b.get("image_url"),
            "use_cases": b.get("use_cases", []),
            "pros": _pros(b),
        },
    }


async def get_all_products() -> list[dict]:
    """Return the full catalog sorted by price ascending."""
    products = await _load_all_products()
    return sorted(products, key=lambda p: int(p.get("price", 0)))


async def _load_all_products() -> list[dict]:
    """Fetch every product document in the collection.

    Tries a N1QL query first (works on Couchbase Capella + local with a primary
    index on the products collection). Falls back to an empty list if the query
    fails — the seed script ensures the primary index exists.
    """
    try:
        cluster = get_cluster()
        bucket_scope = f"`{settings.couchbase_bucket}`.`{settings.couchbase_scope}`.`products`"
        query = f"SELECT meta().id AS id, p.* FROM {bucket_scope} p"
        result = cluster.query(query)
        out: list[dict] = []
        for row in result.rows():
            if isinstance(row, dict):
                out.append(row)
        return out
    except Exception as exc:
        logger.warning("Product search query failed: %s", exc)
        return []
