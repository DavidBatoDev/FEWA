import re
import uuid

from couchbase.exceptions import CouchbaseException
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db.couchbase import get_collection, get_scope
from app.models.lead import Lead
from app.services.sales_workflow import now_iso

router = APIRouter(prefix="/intake-forms", tags=["intake_forms"])

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class IntakeFormCreateRequest(BaseModel):
    company_name: str
    company_description: str = ""
    email: str
    pain_points: list[str]


def _normalize_pain_points(pain_points: list[str]) -> list[str]:
    cleaned: list[str] = []
    for point in pain_points:
        value = point.strip()
        if value:
            cleaned.append(value)
    return cleaned


@router.post("")
async def create_intake_form(payload: IntakeFormCreateRequest):
    company_name = payload.company_name.strip()
    if not company_name:
        raise HTTPException(status_code=400, detail="company_name is required")

    company_description = payload.company_description.strip()

    email = payload.email.strip().lower()
    if not EMAIL_PATTERN.fullmatch(email):
        raise HTTPException(status_code=400, detail="email must be a valid email address")

    pain_points = _normalize_pain_points(payload.pain_points)
    if not pain_points:
        raise HTTPException(status_code=400, detail="pain_points must include at least one item")

    ts = now_iso()
    lead_id = f"lead::{uuid.uuid4()}"
    intake_id = f"intake::{uuid.uuid4()}"

    lead = Lead(
        company=company_name,
        email=email,
        pain_point=pain_points[0],
        status="new",
        intake_form_id=intake_id,
        context_status="none",
        call_status="not_booked",
        created_at=ts,
        updated_at=ts,
    )

    intake_doc = {
        "type": "intake_form",
        "lead_id": lead_id,
        "company_name": company_name,
        "company_description": company_description,
        "email": email,
        "pain_points": pain_points,
        "status": "submitted",
        "created_at": ts,
        "updated_at": ts,
    }

    scope = get_scope()
    duplicate_email_count = 0
    try:
        duplicate_rows = list(
            scope.query(
                """
                SELECT COUNT(1) AS count
                FROM `intake_forms`
                USE INDEX (idx_intake_forms_email USING GSI)
                WHERE LOWER(TRIM(email)) = $email
                """,
                named_parameters={"email": email},
            )
        )
        if duplicate_rows:
            duplicate_email_count = int(duplicate_rows[0].get("count") or 0)
    except CouchbaseException:
        # If index is not yet created, continue with duplicate count fallback.
        duplicate_email_count = 0

    leads_col = get_collection("leads")
    intake_col = get_collection("intake_forms")

    try:
        leads_col.insert(lead_id, lead.model_dump())
        intake_col.insert(intake_id, intake_doc)
    except CouchbaseException as exc:
        raise HTTPException(status_code=503, detail=f"Couchbase error: {exc}") from exc

    response = dict(intake_doc)
    response["id"] = intake_id
    response["duplicate_email_count"] = duplicate_email_count

    return {
        "intake_form": response,
        "lead": {
            "id": lead_id,
            **lead.model_dump(),
        },
    }
