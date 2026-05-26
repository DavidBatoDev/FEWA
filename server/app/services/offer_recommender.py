from app.models.lead import Lead

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
    pain = (lead.pain_point or "").lower()
    solution = (lead.current_solution or "").lower()
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
