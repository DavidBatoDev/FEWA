from app.models.lead import Lead, LeadTemperature


SCORING_CRITERIA = {
    "pain_point": 20,
    "timeline": 20,
    "decision_maker": 20,
    "budget_readiness": 20,
    "contact_details": 10,
    "asked_for_proposal": 10,
}


def score_lead(lead: Lead, asked_for_proposal: bool = False) -> tuple[int, LeadTemperature]:
    score = 0

    if lead.pain_point:
        score += SCORING_CRITERIA["pain_point"]

    if lead.timeline and lead.timeline.lower() not in ("later", "not sure", ""):
        score += SCORING_CRITERIA["timeline"]

    if lead.decision_maker and lead.decision_maker.lower() in ("yes", "true", "owner", "i decide"):
        score += SCORING_CRITERIA["decision_maker"]

    if lead.budget_readiness and lead.budget_readiness.lower() not in ("no", "none", ""):
        score += SCORING_CRITERIA["budget_readiness"]

    if lead.email or lead.phone or lead.name:
        score += SCORING_CRITERIA["contact_details"]

    if asked_for_proposal:
        score += SCORING_CRITERIA["asked_for_proposal"]

    temperature: LeadTemperature
    if score >= 80:
        temperature = "Hot"
    elif score >= 50:
        temperature = "Warm"
    else:
        temperature = "Cold"

    return score, temperature
