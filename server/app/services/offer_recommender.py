from __future__ import annotations

import time
from typing import Any

from couchbase.exceptions import CouchbaseException

from app.config import settings
from app.db.couchbase import get_scope
from app.models.lead import Lead

DEFAULT_RECOMMENDED_OFFER = "Sales Automation Package"

DEFAULT_OFFERS: list[dict[str, Any]] = [
    {
        "name": "Lead Capture Starter",
        "keywords": ["no website", "no form", "basic", "start", "beginning", "simple"],
        "pain_points": ["no leads", "no inquiries", "no online presence"],
    },
    {
        "name": "Growth Campaign Package",
        "keywords": ["more leads", "more clients", "campaign", "ads", "marketing", "grow"],
        "pain_points": ["need more leads", "need more clients", "low inquiries"],
    },
    {
        "name": "Sales Automation Package",
        "keywords": ["follow-up", "tracking", "lost leads", "crm", "manual", "spreadsheet"],
        "pain_points": ["losing leads", "poor tracking", "no follow-up", "manual process"],
    },
    {
        "name": "Enterprise Workflow Package",
        "keywords": ["custom", "integration", "complex", "dashboard", "enterprise", "workflow", "api"],
        "pain_points": ["complex process", "need integration", "custom crm"],
    },
]

_offers_cache: list[dict[str, Any]] = []
_offers_cache_expires_at = 0.0


def _cache_ttl_seconds() -> int:
    configured = getattr(settings, "offers_cache_ttl_seconds", 300)
    try:
        ttl = int(configured)
    except (TypeError, ValueError):
        ttl = 300
    return max(1, ttl)


def _to_clean_str(val: object) -> str:
    if val is None:
        return ""
    if isinstance(val, list):
        return " ".join(str(x) for x in val)
    return str(val).strip()


def _tokenize_from_text(text: str) -> list[str]:
    lowered = text.lower().strip()
    if not lowered:
        return []
    return [tok for tok in lowered.replace("/", " ").replace(",", " ").split() if tok]


def _normalize_offer_doc(raw_offer: dict[str, Any]) -> dict[str, Any] | None:
    name = _to_clean_str(raw_offer.get("name"))
    if not name:
        return None

    rules = raw_offer.get("rules")
    rules_dict = rules if isinstance(rules, dict) else {}
    match_keywords = rules_dict.get("match_keywords")
    keywords = [_to_clean_str(v).lower() for v in (match_keywords or []) if _to_clean_str(v)]

    description = _to_clean_str(raw_offer.get("description")).lower()
    best_for = raw_offer.get("best_for") if isinstance(raw_offer.get("best_for"), list) else []
    best_for_tokens = _tokenize_from_text(" ".join(_to_clean_str(x) for x in best_for))
    pain_points = list(dict.fromkeys(best_for_tokens))

    # If no explicit keywords provided, fall back to description/best-for token hints.
    if not keywords:
        keywords = pain_points

    return {
        "name": name,
        "keywords": list(dict.fromkeys(k for k in keywords if k)),
        "pain_points": list(dict.fromkeys(p for p in pain_points if p)),
    }


def _fetch_offers_from_db() -> list[dict[str, Any]]:
    scope = get_scope()
    query = "SELECT o.* FROM `offers` AS o WHERE o.type = 'offer'"
    rows = list(scope.query(query))

    normalized: list[dict[str, Any]] = []
    for row in rows:
        offer = _normalize_offer_doc(row)
        if offer:
            normalized.append(offer)
    return normalized


def _log_fallback(event: str, reason: str) -> None:
    print(f"[offer_recommender] {event}: {reason}")


def _get_offer_rules() -> list[dict[str, Any]]:
    global _offers_cache, _offers_cache_expires_at

    now = time.time()
    if _offers_cache and now < _offers_cache_expires_at:
        return _offers_cache

    try:
        fetched = _fetch_offers_from_db()
    except CouchbaseException as exc:
        if _offers_cache:
            _log_fallback("db_fetch_failed", str(exc))
            _log_fallback("using_last_good_cache", "offers cache retained")
            _offers_cache_expires_at = now + _cache_ttl_seconds()
            return _offers_cache
        _log_fallback("db_fetch_failed", str(exc))
        _log_fallback("empty_offers_fallback", "using default offers")
        _offers_cache = list(DEFAULT_OFFERS)
        _offers_cache_expires_at = now + _cache_ttl_seconds()
        return _offers_cache
    except Exception as exc:
        if _offers_cache:
            _log_fallback("db_fetch_failed", str(exc))
            _log_fallback("using_last_good_cache", "offers cache retained")
            _offers_cache_expires_at = now + _cache_ttl_seconds()
            return _offers_cache
        _log_fallback("db_fetch_failed", str(exc))
        _log_fallback("empty_offers_fallback", "using default offers")
        _offers_cache = list(DEFAULT_OFFERS)
        _offers_cache_expires_at = now + _cache_ttl_seconds()
        return _offers_cache

    if not fetched:
        if _offers_cache:
            _log_fallback("empty_offers_fallback", "db returned empty offers set")
            _log_fallback("using_last_good_cache", "offers cache retained")
            _offers_cache_expires_at = now + _cache_ttl_seconds()
            return _offers_cache
        _log_fallback("empty_offers_fallback", "db returned empty offers set; using defaults")
        _offers_cache = list(DEFAULT_OFFERS)
        _offers_cache_expires_at = now + _cache_ttl_seconds()
        return _offers_cache

    _offers_cache = fetched
    _offers_cache_expires_at = now + _cache_ttl_seconds()
    return _offers_cache


def recommend_offer(lead: Lead) -> str:
    pain = _to_clean_str(lead.pain_point).lower()
    solution = _to_clean_str(lead.current_solution).lower()
    combined = f"{pain} {solution}".strip()

    offers = _get_offer_rules()
    scores: list[tuple[int, str]] = []
    for offer in offers:
        keywords = offer.get("keywords", [])
        pain_points = offer.get("pain_points", [])
        score = sum(1 for kw in keywords if kw and kw in combined)
        score += sum(1 for pp in pain_points if pp and pp in combined)
        scores.append((score, _to_clean_str(offer.get("name"))))

    scores.sort(reverse=True)

    if scores and scores[0][0] > 0 and scores[0][1]:
        return scores[0][1]

    return DEFAULT_RECOMMENDED_OFFER
