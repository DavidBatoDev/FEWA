import re
import uuid
from typing import Optional

from couchbase.exceptions import CouchbaseException
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db.couchbase import get_collection, get_scope, set_request_scope_from_flow, reset_request_scope
from app.models.lead import Lead
from app.services.sales_workflow import now_iso
from app.services.lead_scorer import score_lead
from app.services.offer_recommender import recommend_offer
from app.services.pdf_extractor import process_pdf_extraction

router = APIRouter(prefix="/intake-forms", tags=["intake_forms"])

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class IntakeFormCreateRequest(BaseModel):
    company_name: str
    company_description: str = ""
    email: str
    pain_points: list[str]
    contact_name: Optional[str] = None
    target_clients: Optional[str] = None
    urgency: Optional[str] = None
    budget_readiness: Optional[str] = None
    decision_maker: Optional[str] = None
    preferred_next_step: Optional[str] = None
    uploaded_pdf_id: Optional[str] = None


def _normalize_pain_points(pain_points: list[str]) -> list[str]:
    cleaned: list[str] = []
    for point in pain_points:
        value = point.strip()
        if value:
            cleaned.append(value)
    return cleaned


@router.post("")
async def create_intake_form(payload: IntakeFormCreateRequest):
    # Intake forms are B2B-specific, set scope to b2b
    token = set_request_scope_from_flow("b2b")
    try:
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
            name=payload.contact_name,
            company=company_name,
            email=email,
            pain_point=pain_points[0] if pain_points else None,
            timeline=payload.urgency,
            budget_readiness=payload.budget_readiness,
            decision_maker=payload.decision_maker,
            next_best_action=payload.preferred_next_step,
            status="new",
            intake_form_id=intake_id,
            context_status="pending" if payload.uploaded_pdf_id else "none",
            call_status="not_booked",
            created_at=ts,
            updated_at=ts,
        )

        # Perform initial lead scoring and offer recommendation
        score, temperature, breakdown = score_lead(lead)
        lead.lead_score = score
        lead.lead_temperature = temperature
        lead.score_breakdown = breakdown
        lead.recommended_offer = recommend_offer(lead)

        intake_doc = {
            "type": "intake_form",
            "lead_id": lead_id,
            "company_name": company_name,
            "company_description": company_description,
            "email": email,
            "pain_points": pain_points,
            "contact_name": payload.contact_name,
            "target_clients": payload.target_clients,
            "urgency": payload.urgency,
            "budget_readiness": payload.budget_readiness,
            "decision_maker": payload.decision_maker,
            "preferred_next_step": payload.preferred_next_step,
            "uploaded_pdf_id": payload.uploaded_pdf_id,
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

        # Process PDF extraction if uploaded_pdf_id is provided
        extraction_result = None
        if payload.uploaded_pdf_id:
            # Map uploaded_pdf_id to file path (assuming uploads directory)
            pdf_file_path = f"uploads/{payload.uploaded_pdf_id}.pdf"
            
            try:
                extraction_result = await process_pdf_extraction(pdf_file_path, lead_id)
                
                # Refresh lead data after extraction
                lead_result = leads_col.get(lead_id)
                lead = Lead(**lead_result.content_as[dict])
            except Exception:
                # Don't block intake form submission if extraction fails
                # The extraction service already handles error logging
                pass

        response = dict(intake_doc)
        response["id"] = intake_id
        response["duplicate_email_count"] = duplicate_email_count

        return {
            "intake_form": response,
            "lead": {
                "id": lead_id,
                **lead.model_dump(),
            },
            "extraction": extraction_result,
        }
    finally:
        reset_request_scope(token)
