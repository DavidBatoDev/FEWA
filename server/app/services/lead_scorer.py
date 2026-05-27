from app.models.lead import Lead, LeadTemperature
from app.services.ai_agent import compute_lead_score, compute_lead_temperature


def score_lead(lead: Lead, asked_for_proposal: bool = False) -> tuple[int, LeadTemperature, dict]:
    """
    Evaluates lead score, temperature, and score breakdown.
    Delegates calculation to app.services.ai_agent.
    """
    score, breakdown = compute_lead_score(lead, asked_for_proposal)
    temperature = compute_lead_temperature(score)
    return score, temperature, breakdown
