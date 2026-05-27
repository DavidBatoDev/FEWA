from __future__ import annotations

from typing import Any

from couchbase.exceptions import CouchbaseException
from fastapi import APIRouter, HTTPException

from app.db.couchbase import get_scope

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _to_int(value: Any) -> int:
    if value is None:
        return 0
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _to_title_case(value: str) -> str:
    # Keep objection labels clean and readable in dashboard cards.
    return " ".join(part.capitalize() for part in value.split())


@router.get("/stats")
async def get_dashboard_stats():
    scope = get_scope()

    try:
        counts_query = """
        SELECT
          COUNT(1) AS total_leads,
          SUM(CASE WHEN lead_temperature = "Hot" THEN 1 ELSE 0 END) AS hot_leads,
          SUM(CASE WHEN lead_temperature = "Warm" THEN 1 ELSE 0 END) AS warm_leads,
          SUM(CASE WHEN lead_temperature = "Cold" THEN 1 ELSE 0 END) AS cold_leads
        FROM `leads`
        USE INDEX (idx_leads_temperature USING GSI)
        """
        counts_rows = list(scope.query(counts_query))
        counts = counts_rows[0] if counts_rows else {}

        latest_leads_query = """
        SELECT
          META().id AS id,
          name,
          company,
          lead_score,
          lead_temperature,
          recommended_offer,
          created_at
        FROM `leads`
        USE INDEX (idx_leads_created_at USING GSI)
        ORDER BY created_at DESC
        LIMIT 5
        """
        latest_leads_rows = list(scope.query(latest_leads_query))

        follow_ups_query = """
        SELECT
          COUNT(created_at) AS follow_ups_generated
        FROM `follow_ups`
        USE INDEX (idx_followups_created_at USING GSI)
        WHERE created_at IS NOT MISSING
        """
        follow_up_rows = list(scope.query(follow_ups_query))
        follow_up_count = follow_up_rows[0] if follow_up_rows else {}

        top_objections_query = """
        SELECT
          LOWER(TRIM(objection)) AS objection_key,
          COUNT(1) AS count
        FROM `conversations` AS c
        USE INDEX (idx_conversations_objections_norm USING GSI)
        UNNEST c.objections AS objection
        WHERE objection IS NOT NULL
          AND objection IS NOT MISSING
          AND LOWER(TRIM(objection)) != ""
        GROUP BY LOWER(TRIM(objection))
        ORDER BY count DESC, objection_key ASC
        LIMIT 5
        """
        top_objections_rows = list(scope.query(top_objections_query))
    except CouchbaseException as exc:
        raise HTTPException(status_code=503, detail=f"Couchbase error: {exc}") from exc

    latest_leads = [
        {
            "id": row.get("id", ""),
            "name": row.get("name"),
            "company": row.get("company"),
            "lead_score": _to_int(row.get("lead_score")),
            "lead_temperature": row.get("lead_temperature"),
            "recommended_offer": row.get("recommended_offer"),
            "created_at": row.get("created_at", ""),
        }
        for row in latest_leads_rows
    ]

    top_objections = [
        {
            "objection": _to_title_case(str(row.get("objection_key", ""))),
            "count": _to_int(row.get("count")),
        }
        for row in top_objections_rows
        if str(row.get("objection_key", "")).strip()
    ]

    return {
        "total_leads": _to_int(counts.get("total_leads")),
        "hot_leads": _to_int(counts.get("hot_leads")),
        "warm_leads": _to_int(counts.get("warm_leads")),
        "cold_leads": _to_int(counts.get("cold_leads")),
        "follow_ups_generated": _to_int(follow_up_count.get("follow_ups_generated")),
        "latest_leads": latest_leads,
        "top_objections": top_objections,
    }
