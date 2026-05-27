from typing import Literal, Optional
from pydantic import BaseModel

LeadTemperature = Literal["Hot", "Warm", "Cold"]
LeadStatus = Literal["new", "in_progress", "qualified", "disqualified"]


class Lead(BaseModel):
    type: str = "lead"
    campaign_id: Optional[str] = None
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    industry: Optional[str] = None
    pain_point: Optional[str] = None
    current_solution: Optional[str] = None
    timeline: Optional[str] = None
    budget_readiness: Optional[str] = None
    decision_maker: Optional[str] = None
    buying_intent: Optional[str] = None
    intake_form_id: Optional[str] = None
    call_status: Optional[str] = None
    call_slot: Optional[str] = None
    context_status: Optional[str] = None
    conversation_summary: Optional[str] = None
    follow_up_subject: Optional[str] = None
    follow_up_body: Optional[str] = None
    objections: list[str] = []
    buying_signals: list[str] = []
    lead_score: int = 0
    lead_temperature: Optional[LeadTemperature] = None
    asked_for_proposal: Optional[bool] = False
    score_breakdown: Optional[dict] = None
    recommended_offer: Optional[str] = None
    next_best_action: Optional[str] = None
    is_potential_lead: bool = False
    discovery_call_schedule: Optional[str] = None
    status: LeadStatus = "new"
    created_at: str = ""
    updated_at: str = ""


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    industry: Optional[str] = None
    pain_point: Optional[str] = None
    current_solution: Optional[str] = None
    timeline: Optional[str] = None
    budget_readiness: Optional[str] = None
    decision_maker: Optional[str] = None
    buying_intent: Optional[str] = None
    intake_form_id: Optional[str] = None
    call_status: Optional[str] = None
    call_slot: Optional[str] = None
    context_status: Optional[str] = None
    asked_for_proposal: Optional[bool] = None
    score_breakdown: Optional[dict] = None
    status: Optional[LeadStatus] = None


class LeadResponse(Lead):
    id: str
