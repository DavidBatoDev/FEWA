from app.models.lead import Lead
from app.services.ai_agent import recommend_offer as ai_recommend_offer


def recommend_offer(lead: Lead) -> str:
    """
    Recommends the best offer package for the lead.
    Delegates calculation to app.services.ai_agent.
    """
    return ai_recommend_offer(lead)
