#!/usr/bin/env python3
"""
Unit tests for next_best_action.calculate_next_best_action.
No server required — tests the logic directly.

Run: python tests/test_nba_unit.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.models.lead import Lead
from app.services.next_best_action import calculate_next_best_action

PASS = "✅"
FAIL = "❌"
results: list[tuple[str, bool, str]] = []


def check(name: str, lead: Lead, *fragments: str):
    nba = calculate_next_best_action(lead)
    ok = any(f.lower() in nba.lower() for f in fragments)
    results.append((name, ok, nba))
    icon = PASS if ok else FAIL
    print(f"  {icon} {name}")
    print(f"     NBA: {nba}")
    if not ok:
        print(f"     Expected one of: {fragments}")


def hot(**kw) -> Lead:
    return Lead(lead_temperature="Hot", lead_score=80, **kw)

def warm(**kw) -> Lead:
    return Lead(lead_temperature="Warm", lead_score=50, **kw)

def cold(**kw) -> Lead:
    return Lead(lead_temperature="Cold", lead_score=20, **kw)


print("=" * 60)
print("NEXT BEST ACTION — Unit Tests")
print("=" * 60)

# ── Temperature-based (no objections) ────────────────────────────────────────
print("\n[Temperature-based defaults]")
check("Hot + urgent timeline → schedule call immediately",
      hot(timeline="this week"), "schedule", "discovery call")

check("Hot + asked for proposal → send proposal",
      hot(asked_for_proposal=True), "proposal")

check("Hot + no extras → schedule call this week",
      hot(), "schedule", "discovery call")

check("Warm + asked for proposal → send product overview/pricing",
      warm(asked_for_proposal=True), "product", "pricing", "proposal")

check("Warm + pain point → send solution brief",
      warm(pain_point="manual follow-ups"), "solution", "pain", "send")

check("Warm + no extras → send demo/case studies",
      warm(), "demo", "case stud", "product")

check("Cold + pain point → educational content",
      cold(pain_point="lead tracking"), "educational", "content", "nurture")

check("Cold + no extras → nurture campaign",
      cold(), "nurture")

# ── Objection-aware ───────────────────────────────────────────────────────────
print("\n[Objection-aware actions]")
check("Pricing objection (Hot) → pricing structure + ROI",
      hot(objections=["The pricing is too expensive"]), "pricing", "roi")

check("Pricing objection (Warm) → pricing options + case studies",
      warm(objections=["cost is a concern"]), "pricing", "case stud")

check("Pricing objection (Cold) → pricing guide",
      cold(objections=["budget is tight"]), "pricing", "guide")

check("Approval objection → stakeholder deck",
      warm(objections=["need approval from my manager"]), "stakeholder", "presentation")

check("Existing supplier objection → competitive comparison",
      warm(objections=["we already have a vendor"]), "competitive", "comparison", "migration")

check("No budget objection → flexible payment / ROI calculator",
      warm(objections=["no budget right now"]), "payment", "roi", "flexible")

check("Proof objection → case studies / testimonials",
      warm(objections=["we need proof it works"]), "case stud", "testimonial")

# ── Timeline-aware ────────────────────────────────────────────────────────────
print("\n[Timeline-aware actions]")
check("Not-urgent timeline (Hot) → ROI case study",
      hot(timeline="not urgent, maybe next year"), "roi", "case stud")

check("Not-urgent timeline (Warm) → nurture / monthly check-ins",
      warm(timeline="no rush"), "nurture", "check-in")

check("Not-urgent timeline (Cold) → long-term nurture",
      cold(timeline="someday in the future"), "nurture")

# ── Call status ───────────────────────────────────────────────────────────────
print("\n[Call status overrides]")
check("Call booked → confirm booking",
      hot(call_status="booked", call_slot="Monday 10am"), "booked", "monday")

check("Call booked (no slot) → discovery call booked",
      hot(call_status="booked"), "booked")

check("Call completed → follow up",
      hot(call_status="completed"), "follow up")

check("Call cancelled → reschedule",
      hot(call_status="cancelled"), "reschedule")

check("Call proposed → confirm slot",
      hot(call_status="proposed"), "confirm")

# ── Summary ───────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
passed = sum(1 for _, ok, _ in results if ok)
total = len(results)
print(f"Results: {passed}/{total} passed")
print("=" * 60)
sys.exit(0 if passed == total else 1)
