from openai import AsyncOpenAI
from app.config import settings
from app.models.lead import Lead


def _has_openai_key() -> bool:
    return bool(settings.openai_api_key and settings.openai_api_key.strip())


async def generate_follow_up(lead: Lead) -> dict[str, str]:
    summary = (lead.conversation_summary or "").strip() or "Discussion captured and summarized by Workflow PH."
    call_schedule = (lead.call_slot or "").strip() or "To be scheduled"
    pain_point = (lead.pain_point or "").strip() or "Needs stronger lead handling and follow-up."
    recommended_offer = (lead.recommended_offer or "").strip() or "Sales Automation Package"
    next_steps = (lead.next_best_action or "").strip() or "Reply to confirm your preferred discovery call time."

    def _meeting_notes_body() -> str:
        return (
            "Hi,\n\n"
            "Thanks for your time today. Here are your meeting notes:\n\n"
            f"Conversation Summary:\n{summary}\n\n"
            f"Key Pain Point / Need:\n{pain_point}\n\n"
            f"Recommended Offer:\n{recommended_offer}\n\n"
            f"Discovery Call Schedule:\n{call_schedule}\n\n"
            f"Next Steps:\n{next_steps}\n\n"
            "Best regards,\nWorkflow PH"
        )

    if not _has_openai_key():
        subject = f"Meeting Notes and Next Steps - {lead.company or 'Your Business'}"
        body = _meeting_notes_body()
        return {"subject": subject, "body": body}

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    prompt = f"""You are a professional sales follow-up writer for FFlow PH.

Lead profile:
- Company: {lead.company or "Unknown"}
- Industry: {lead.industry or "Unknown"}
- Pain Point: {lead.pain_point or "Unknown"}
- Recommended Offer: {lead.recommended_offer or "Unknown"}
- Next Best Action: {lead.next_best_action or "Book a discovery call"}
- Conversation Summary: {summary}
- Discovery Call Schedule: {call_schedule}

Write a short, professional meeting-notes style follow-up email with:
1. A concise subject line
2. A brief body with these sections exactly:
- Conversation Summary
- Key Pain Point / Need
- Recommended Offer
- Discovery Call Schedule
- Next Steps

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

    body_lines: list[str] = []
    in_body = False
    for line in text.split("\n"):
        if line.startswith("SUBJECT:"):
            subject = line.replace("SUBJECT:", "").strip()
        elif line.startswith("BODY:"):
            body = line.replace("BODY:", "").strip()
            in_body = True
        elif in_body:
            body_lines.append(line.rstrip())

    if body_lines:
        body = (body + "\n" + "\n".join(body_lines)).strip()

    if not subject:
        subject = f"Meeting Notes and Next Steps - {lead.company or 'Your Business'}"
    if not body:
        body = _meeting_notes_body()

    return {"subject": subject, "body": body}
