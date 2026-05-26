from typing import Literal, Optional
from pydantic import BaseModel

LanguageMode = Literal["English", "Taglish", "Filipino"]


class QualificationRules(BaseModel):
    required_fields: list[str] = ["pain_point", "timeline", "decision_maker", "budget_readiness"]
    hot_lead_threshold: int = 80
    warm_lead_threshold: int = 50


class Campaign(BaseModel):
    type: str = "campaign"
    name: str
    target_industry: str
    agent_persona: str
    goal: str
    language_mode: LanguageMode = "English"
    qualification_rules: QualificationRules = QualificationRules()
    created_at: str = ""


class CampaignResponse(Campaign):
    id: str
