from typing import Literal
from pydantic import BaseModel, Field, field_validator, model_validator

LanguageMode = Literal["English", "Taglish", "Filipino"]

ALLOWED_QUALIFICATION_FIELDS = {
    "name",
    "email",
    "phone",
    "company",
    "industry",
    "pain_point",
    "current_solution",
    "timeline",
    "budget_readiness",
    "decision_maker",
    "buying_intent",
}


class QualificationRules(BaseModel):
    required_fields: list[str] = Field(
        default_factory=lambda: ["pain_point", "timeline", "decision_maker", "budget_readiness"]
    )
    hot_lead_threshold: int = 80
    warm_lead_threshold: int = 50

    @field_validator("required_fields")
    @classmethod
    def validate_required_fields(cls, value: list[str]) -> list[str]:
        invalid_fields = [field for field in value if field not in ALLOWED_QUALIFICATION_FIELDS]
        if invalid_fields:
            invalid = ", ".join(sorted(set(invalid_fields)))
            raise ValueError(f"Invalid qualification required_fields: {invalid}")
        return value

    @field_validator("hot_lead_threshold", "warm_lead_threshold")
    @classmethod
    def validate_threshold_range(cls, value: int) -> int:
        if value < 0 or value > 100:
            raise ValueError("Thresholds must be between 0 and 100")
        return value

    @model_validator(mode="after")
    def validate_threshold_order(self):
        if self.warm_lead_threshold >= self.hot_lead_threshold:
            raise ValueError("warm_lead_threshold must be less than hot_lead_threshold")
        return self


class CampaignCreate(BaseModel):
    name: str
    target_industry: str
    agent_persona: str
    goal: str
    language_mode: LanguageMode = "English"
    qualification_rules: QualificationRules = Field(default_factory=QualificationRules)


class Campaign(BaseModel):
    type: str = "campaign"
    name: str
    target_industry: str
    agent_persona: str
    goal: str
    language_mode: LanguageMode = "English"
    qualification_rules: QualificationRules = Field(default_factory=QualificationRules)
    created_at: str = ""


class CampaignResponse(Campaign):
    id: str
