from openai import AsyncOpenAI
from app.config import settings
from app.models.lead import Lead


def _has_openai_key() -> bool:
    return bool(settings.openai_api_key and settings.openai_api_key.strip())


async def generate_follow_up(lead: Lead) -> dict[str, str]:
    if not _has_openai_key():
        subject = f"Recommended Sales Workflow Setup for {lead.company or 'Your Business'}"
        body = (
            "Hi there, thanks for sharing your goals with us. "
            f"Based on your current challenges, we recommend the {lead.recommended_offer or 'Sales Automation Package'}. "
            f"Next step: {lead.next_best_action or 'Book a short discovery call'} so we can map a practical rollout plan."
        )
        return {"subject": subject, "body": body}

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    prompt = f"""You are a professional sales follow-up writer for Workflow PH.

Lead profile:
- Company: {lead.company or "Unknown"}
- Industry: {lead.industry or "Unknown"}
- Pain Point: {lead.pain_point or "Unknown"}
- Recommended Offer: {lead.recommended_offer or "Unknown"}
- Next Best Action: {lead.next_best_action or "Book a discovery call"}

Write a short, professional follow-up email with:
1. A subject line
2. A brief email body (3-4 sentences max)

Format your response as:
SUBJECT: <subject line>
BODY: <email body>"""

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )

    text = response.choices[0].message.content or ""
    subject = ""
    body = ""

    for line in text.split("\n"):
        if line.startswith("SUBJECT:"):
            subject = line.replace("SUBJECT:", "").strip()
        elif line.startswith("BODY:"):
            body = line.replace("BODY:", "").strip()

    return {"subject": subject, "body": body}
