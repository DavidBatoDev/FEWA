from pydantic import BaseModel


class OfferRules(BaseModel):
    match_keywords: list[str] = []
    recommended_when: list[str] = []


class Offer(BaseModel):
    type: str = "offer"
    name: str
    description: str
    best_for: list[str] = []
    price_range: str = "Custom pricing"
    rules: OfferRules = OfferRules()
    created_at: str = ""


class OfferResponse(Offer):
    id: str
