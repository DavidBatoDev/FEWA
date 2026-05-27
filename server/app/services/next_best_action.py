from app.models.lead import Lead, LeadTemperature


def _has_objection_type(objections: list[str], keywords: list[str]) -> bool:
    """Check if any objection contains specific keywords."""
    if not objections:
        return False

    objections_lower = [obj.lower() for obj in objections]
    for keyword in keywords:
        if any(keyword.lower() in obj for obj in objections_lower):
            return True
    return False


def _is_timeline_urgent(timeline: str | None) -> bool:
    """Check if timeline indicates urgency."""
    if not timeline:
        return False

    timeline_lower = timeline.lower()
    urgent_keywords = ["urgent", "asap", "immediately", "this week", "this month", "now"]
    return any(keyword in timeline_lower for keyword in urgent_keywords)


def _is_timeline_not_urgent(timeline: str | None) -> bool:
    """Check if timeline indicates no urgency."""
    if not timeline:
        return False

    timeline_lower = timeline.lower()
    not_urgent_keywords = ["later", "next year", "not urgent", "no rush", "future", "someday"]
    return any(keyword in timeline_lower for keyword in not_urgent_keywords)


def calculate_next_best_action(lead: Lead) -> str:
    """
    Calculate the next best action based on lead state.

    Priority order:
    1. Call status (if call is booked/completed)
    2. Objection-specific actions
    3. Temperature-based actions
    4. Default fallback
    """

    # Priority 1: Call status takes precedence
    if lead.call_status:
        if lead.call_status == "booked":
            return f"Discovery call booked{f' — {lead.call_slot}' if lead.call_slot else ''}"
        elif lead.call_status == "completed":
            return "Follow up on discovery call outcomes"
        elif lead.call_status == "cancelled":
            return "Reschedule discovery call"
        elif lead.call_status == "proposed":
            return "Confirm discovery call slot"

    # Priority 2: Objection-aware actions
    objections = lead.objections or []

    # No budget objection (must come before generic pricing check)
    if _has_objection_type(objections, ["no budget", "can't afford", "too expensive"]):
        return "Share flexible payment options and ROI calculator"

    # Pricing objection
    if _has_objection_type(objections, ["price", "pricing", "cost", "expensive", "budget"]):
        if lead.lead_temperature == "Hot":
            return "Provide detailed pricing structure and ROI breakdown"
        elif lead.lead_temperature == "Warm":
            return "Send pricing options with case studies"
        else:
            return "Share pricing guide and success stories"

    # Needs approval objection
    if _has_objection_type(objections, ["approval", "boss", "manager", "team", "partner"]):
        return "Prepare stakeholder presentation deck"

    # Already has supplier objection
    if _has_objection_type(objections, ["supplier", "vendor", "already have", "current solution"]):
        return "Send competitive comparison and migration guide"

    # Wants proof objection
    if _has_objection_type(objections, ["proof", "evidence", "case study", "testimonial", "reference"]):
        return "Send relevant case studies and client testimonials"

    # Priority 3: Timeline-aware actions
    if _is_timeline_not_urgent(lead.timeline):
        if lead.lead_temperature == "Hot":
            return "Send ROI case study to maintain engagement"
        elif lead.lead_temperature == "Warm":
            return "Add to nurture campaign with monthly check-ins"
        else:
            return "Add to long-term nurture sequence"

    # Priority 4: Temperature-based actions (default)
    temperature = lead.lead_temperature

    if temperature == "Hot":
        # Hot leads: Push for commitment
        if lead.asked_for_proposal:
            return "Send detailed proposal and schedule follow-up call"
        elif _is_timeline_urgent(lead.timeline):
            return "Schedule discovery call immediately"
        else:
            return "Schedule discovery call this week"

    elif temperature == "Warm":
        # Warm leads: Build value and move forward
        if lead.asked_for_proposal:
            return "Send product overview and pricing guide"
        elif lead.pain_point:
            return "Send solution brief addressing their pain points"
        else:
            return "Send product demo video and case studies"

    elif temperature == "Cold":
        # Cold leads: Nurture and educate
        if lead.pain_point:
            return "Send educational content about their challenges"
        else:
            return "Add to nurture campaign with industry insights"

    # Fallback
    return "Qualify lead further with discovery questions"


def update_lead_next_best_action(lead: Lead) -> Lead:
    """
    Update the lead's next_best_action field.
    Returns the updated lead object.
    """
    lead.next_best_action = calculate_next_best_action(lead)
    return lead
