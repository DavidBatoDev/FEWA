from openai import AsyncOpenAI
from app.config import settings
from app.models.conversation import TranscriptEntry
from app.models.lead import Lead, LeadTemperature

SYSTEM_PROMPT = """You are Workflow PH Sales Agent, a real-time AI sales qualification agent for Philippine service businesses. You are powered by GPT-4o mini.

Your job is to hold a natural sales conversation while moving the lead toward a clear business outcome.

You must:
1. Understand the customer's business and main problem.
2. Ask short, natural discovery questions one at a time.
3. Identify pain point, urgency, budget readiness, decision-maker status, and preferred next step.
4. Detect objections and buying signals.
5. Recommend the most relevant service package only after enough context is gathered.
6. Score the lead as Hot, Warm, or Cold.
7. Prepare a concise sales summary for the human sales team.
8. Never pressure the user.
9. Never overpromise.
10. If unsure, suggest a human consultation.

Your style is helpful, consultative, confident, friendly, and concise. Ask one question at a time."""


def _has_openai_key() -> bool:
    return bool(settings.openai_api_key and settings.openai_api_key.strip())


def _offline_response(transcript: list[TranscriptEntry], language_mode: str = "English") -> str:
    full_text = " ".join([entry.message.lower() for entry in transcript if entry.role == "user"])

    if "timeline" not in full_text and "month" not in full_text and "urgent" not in full_text:
        return "Thanks for sharing that. How soon do you want to improve this, this month, this quarter, or later?"

    if "budget" not in full_text and "proposal" not in full_text and "price" not in full_text:
        return "Got it. Do you already have a budget range in mind, or are you open to a proposal first?"

    if "owner" not in full_text and "decision" not in full_text:
        return "Are you the decision maker for this project, or will someone else approve it?"

    if language_mode == "Taglish":
        return "Based sa shared details mo, mukhang fit ang Sales Automation Package. Gusto mo ba ng short discovery call next?"
    return "Based on what you shared, the Sales Automation Package looks like the best fit. Would you like to book a short discovery call next?"


async def get_agent_response(
    transcript: list[TranscriptEntry],
    language_mode: str = "English",
) -> str:
    if not _has_openai_key():
        return _offline_response(transcript, language_mode)

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    system = SYSTEM_PROMPT
    if language_mode == "Taglish":
        system += "\n\nSpeak in natural Taglish, a mix of Filipino and English common in the Philippines."

    messages = [{"role": "system", "content": system}]
    for entry in transcript:
        messages.append({"role": entry.role, "content": entry.message})

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.8,
        max_tokens=300,
    )

    return response.choices[0].message.content or ""


async def extract_lead_profile(transcript: list[TranscriptEntry]) -> dict:
    if not _has_openai_key():
        full_text = " ".join([entry.message.lower() for entry in transcript if entry.role == "user"])
        inferred_industry = "Logistics" if "logistics" in full_text else None
        inferred_company = "Unknown Company" if "company" in full_text else None

        objections = []
        if "price" in full_text or "pricing" in full_text or "expensive" in full_text:
            objections.append("Wants pricing details first")

        buying_signals = []
        if "urgent" in full_text or "this month" in full_text:
            buying_signals.append("Urgent timeline")
        if "owner" in full_text or "i decide" in full_text or "decision maker" in full_text:
            buying_signals.append("Decision-maker involved")

        return {
            "name": None,
            "company": inferred_company,
            "industry": inferred_industry,
            "pain_point": "Lead generation and follow-up challenges" if "lead" in full_text else None,
            "current_solution": "Manual process" if "manual" in full_text or "spreadsheet" in full_text else None,
            "timeline": "This month" if "this month" in full_text else None,
            "budget_readiness": "Open to proposal" if "proposal" in full_text else None,
            "decision_maker": "Yes" if ("owner" in full_text or "i decide" in full_text) else None,
            "buying_intent": "High" if ("urgent" in full_text or "need" in full_text) else "Medium",
            "objections": objections,
            "buying_signals": buying_signals,
            "asked_for_proposal": ("proposal" in full_text or "price" in full_text or "pricing" in full_text),
        }

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    conversation_text = "\n".join(
        f"{e.role.upper()}: {e.message}" for e in transcript
    )

    prompt = f"""Extract structured sales information from this conversation transcript.

Transcript:
{conversation_text}

Return a JSON object with these fields (use null if not mentioned):
{{
  "name": null,
  "company": null,
  "industry": null,
  "pain_point": null,
  "current_solution": null,
  "timeline": null,
  "budget_readiness": null,
  "decision_maker": null,
  "buying_intent": null,
  "objections": [],
  "buying_signals": [],
  "asked_for_proposal": false
}}

Return only valid JSON, no explanation."""

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
        response_format={"type": "json_object"},
    )

    import json
    text = response.choices[0].message.content or "{}"
    return json.loads(text)


def _offline_summary(transcript: list[TranscriptEntry]) -> str:
    user_messages = [entry.message.strip() for entry in transcript if entry.role == "user" and entry.message.strip()]

    if not user_messages:
        return "Conversation ended before enough details were captured."

    first_user = user_messages[0] if user_messages else "Lead shared initial context."
    latest_user = user_messages[-1] if user_messages else None
    if latest_user and latest_user != first_user:
        return f"The lead shared key needs: {first_user} Latest update from the lead: {latest_user}"
    return f"The lead shared key needs: {first_user}"


async def generate_conversation_summary(transcript: list[TranscriptEntry]) -> str:
    fallback_summary = _offline_summary(transcript)
    if not _has_openai_key():
        return fallback_summary

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    conversation_text = "\n".join(f"{e.role.upper()}: {e.message}" for e in transcript)
    if not conversation_text.strip():
        return fallback_summary

    prompt = f"""Summarize this sales conversation in 1-2 concise sentences for a human sales teammate.
Include core business need, urgency or readiness signals, and any notable concern if present.

Transcript:
{conversation_text}

Return plain text only."""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
            max_tokens=120,
        )
        summary = (response.choices[0].message.content or "").strip()
        return summary or fallback_summary
    except Exception:
        return fallback_summary


def _to_clean_str(val: object) -> str:
    if val is None:
        return ""
    if isinstance(val, list):
        return " ".join(str(x) for x in val)
    return str(val).strip()


def compute_lead_score(lead: Lead, asked_for_proposal: bool = False) -> tuple[int, dict]:
    breakdown = {}
    score = 0

    pain_point_str = _to_clean_str(lead.pain_point)
    timeline_str = _to_clean_str(lead.timeline)
    decision_maker_str = _to_clean_str(lead.decision_maker)
    budget_readiness_str = _to_clean_str(lead.budget_readiness)

    # 1. Clear pain point (+20)
    if pain_point_str:
        breakdown["pain_point"] = {"status": "Yes", "points": 20}
        score += 20
    else:
        breakdown["pain_point"] = {"status": "No", "points": 0}

    # 2. Urgent timeline (+20)
    if timeline_str and timeline_str.lower() not in ("later", "not sure", "no", "none"):
        breakdown["timeline"] = {"status": "Yes", "points": 20}
        score += 20
    else:
        breakdown["timeline"] = {"status": "No", "points": 0}

    # 3. Decision maker (+20)
    if decision_maker_str and any(kw in decision_maker_str.lower() for kw in ("yes", "true", "owner", "decide")):
        breakdown["decision_maker"] = {"status": "Yes", "points": 20}
        score += 20
    else:
        breakdown["decision_maker"] = {"status": "No", "points": 0}

    # 4. Budget readiness (+20 or +10 partial)
    budget_val = budget_readiness_str.lower()
    if not budget_val or budget_val in ("no", "none", "no budget", "false"):
        breakdown["budget_readiness"] = {"status": "No", "points": 0}
    elif any(kw in budget_val for kw in ("proposal", "open", "partial", "not sure", "depends")):
        breakdown["budget_readiness"] = {"status": "Partial", "points": 10}
        score += 10
    else:
        breakdown["budget_readiness"] = {"status": "Yes", "points": 20}
        score += 20

    # 5. Contact details (+10)
    if lead.email or lead.phone or lead.name:
        breakdown["contact_details"] = {"status": "Yes", "points": 10}
        score += 10
    else:
        breakdown["contact_details"] = {"status": "No", "points": 0}

    # 6. Asked for proposal (+10)
    if asked_for_proposal or getattr(lead, "asked_for_proposal", False):
        breakdown["asked_for_proposal"] = {"status": "Yes", "points": 10}
        score += 10
    else:
        breakdown["asked_for_proposal"] = {"status": "No", "points": 0}

    return score, breakdown


def compute_lead_temperature(score: int) -> LeadTemperature:
    if score >= 80:
        return "Hot"
    elif score >= 50:
        return "Warm"
    else:
        return "Cold"


OFFERS = [
    {
        "name": "Lead Capture Starter",
        "keywords": ["no website", "no form", "basic", "start", "beginning"],
        "pain_points": ["no leads", "no inquiries", "no online presence"],
    },
    {
        "name": "Growth Campaign Package",
        "keywords": ["more leads", "more clients", "campaign", "ads", "marketing"],
        "pain_points": ["need more leads", "need more clients", "low inquiries"],
    },
    {
        "name": "Sales Automation Package",
        "keywords": ["follow-up", "tracking", "lost leads", "crm", "manual", "spreadsheet"],
        "pain_points": ["losing leads", "poor tracking", "no follow-up", "manual process"],
    },
    {
        "name": "Enterprise Workflow Package",
        "keywords": ["custom", "integration", "complex", "dashboard", "enterprise", "workflow"],
        "pain_points": ["complex process", "need integration", "custom crm"],
    },
]


def recommend_offer(lead: Lead) -> str:
    pain = _to_clean_str(lead.pain_point).lower()
    solution = _to_clean_str(lead.current_solution).lower()
    combined = f"{pain} {solution}"

    scores = []
    for offer in OFFERS:
        score = sum(1 for kw in offer["keywords"] if kw in combined)
        score += sum(1 for pp in offer["pain_points"] if pp in combined)
        scores.append((score, offer["name"]))

    scores.sort(reverse=True)

    if scores and scores[0][0] > 0:
        return scores[0][1]

    return "Sales Automation Package"
