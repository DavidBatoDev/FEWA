from openai import AsyncOpenAI
from app.config import settings
from app.models.conversation import TranscriptEntry

SYSTEM_PROMPT = """You are Workflow PH Sales Agent, a real-time AI sales qualification agent for Philippine service businesses.

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
