#!/usr/bin/env python3
"""
Tests for next-best-action logic via the /agent endpoints.
Requires server running at localhost:8000 with B2B flow active.

Run: python tests/test_next_best_action.py
"""

import requests
import sys

BASE_URL = "http://localhost:8000"
HEADERS = {"x-sales-flow": "b2b"}

PASS = "✅"
FAIL = "❌"
results: list[tuple[str, bool, str]] = []


def start() -> tuple[str, str]:
    r = requests.post(f"{BASE_URL}/agent/start", json={"campaign_id": ""}, headers=HEADERS)
    r.raise_for_status()
    d = r.json()
    return d["lead_id"], d["conversation_id"]


def message(lead_id: str, conv_id: str, msg: str) -> dict:
    r = requests.post(
        f"{BASE_URL}/agent/message",
        json={"lead_id": lead_id, "conversation_id": conv_id, "message": msg},
        headers=HEADERS,
    )
    r.raise_for_status()
    return r.json()


def end(lead_id: str, conv_id: str) -> dict:
    r = requests.post(
        f"{BASE_URL}/agent/end",
        json={"lead_id": lead_id, "conversation_id": conv_id},
        headers=HEADERS,
    )
    r.raise_for_status()
    return r.json()


def check(name: str, nba: str, expected_fragment: str):
    ok = expected_fragment.lower() in nba.lower()
    results.append((name, ok, nba))
    icon = PASS if ok else FAIL
    print(f"  {icon} {name}")
    print(f"     NBA: {nba}")
    if not ok:
        print(f"     Expected to contain: '{expected_fragment}'")


# ── Test cases ────────────────────────────────────────────────────────────────

def test_hot_lead_no_objection():
    """Hot lead with urgent timeline → schedule discovery call."""
    print("\n[1] Hot lead, urgent timeline, no objection")
    lid, cid = start()
    message(lid, cid, (
        "Hi, I'm the CEO of TechCorp. We urgently need a CRM solution this week. "
        "We have budget approved and I'm the decision maker. "
        "We want to move forward immediately."
    ))
    d = message(lid, cid, "Yes, let's schedule a call as soon as possible.")
    check("Hot lead → schedule discovery call", d["next_best_action"], "schedule")


def test_warm_lead_no_objection():
    """Warm lead → send product demo or proposal."""
    print("\n[2] Warm lead, no objection")
    lid, cid = start()
    message(lid, cid, (
        "We're a mid-size company looking for a sales automation tool. "
        "We have some budget but need to evaluate options first."
    ))
    d = message(lid, cid, "Can you tell me more about what you offer?")
    check("Warm lead → send demo/proposal/case studies", d["next_best_action"],
          any_of(["demo", "proposal", "case stud", "product", "send"]))


def test_cold_lead_no_objection():
    """Cold lead → nurture campaign."""
    print("\n[3] Cold lead, no objection")
    lid, cid = start()
    message(lid, cid, "Just browsing, not really looking for anything specific right now.")
    d = message(lid, cid, "Maybe someday we'll need something like this.")
    check("Cold lead → nurture", d["next_best_action"], any_of(["nurture", "insight", "educate"]))


def test_pricing_objection():
    """Pricing objection → provide pricing structure."""
    print("\n[4] Pricing objection")
    lid, cid = start()
    message(lid, cid, (
        "We're interested but the pricing seems too expensive for our budget. "
        "We're a growing startup and cost is a major concern."
    ))
    d = message(lid, cid, "The price is really the main blocker for us right now.")
    check("Pricing objection → pricing structure/options", d["next_best_action"],
          any_of(["pricing", "price", "cost", "payment", "roi"]))


def test_not_urgent_timeline():
    """Not-urgent timeline → send ROI case study."""
    print("\n[5] Not-urgent timeline")
    lid, cid = start()
    message(lid, cid, (
        "We're a large enterprise. We're interested but there's no rush — "
        "maybe next year we'll revisit this. No urgency at all."
    ))
    d = message(lid, cid, "We're not in a hurry, just exploring options for the future.")
    check("Not-urgent timeline → ROI case study / nurture", d["next_best_action"],
          any_of(["roi", "case stud", "nurture", "engage"]))


def test_approval_objection():
    """Needs approval objection → stakeholder deck."""
    print("\n[6] Needs approval objection")
    lid, cid = start()
    message(lid, cid, (
        "I like what I see but I need to get approval from my manager and the board "
        "before we can proceed with anything."
    ))
    d = message(lid, cid, "My boss and partners need to sign off on this.")
    check("Approval objection → stakeholder deck", d["next_best_action"],
          any_of(["stakeholder", "presentation", "deck", "approval"]))


def test_proof_objection():
    """Wants proof → send case studies."""
    print("\n[7] Proof/evidence objection")
    lid, cid = start()
    message(lid, cid, (
        "Before we commit, we need to see proof that this actually works. "
        "Do you have case studies or testimonials from similar companies?"
    ))
    d = message(lid, cid, "We need evidence and references before deciding.")
    check("Proof objection → case studies/testimonials", d["next_best_action"],
          any_of(["case stud", "testimonial", "reference", "proof"]))


def test_nba_in_end_response():
    """/agent/end also returns next_best_action."""
    print("\n[8] /agent/end returns next_best_action")
    lid, cid = start()
    message(lid, cid, "We need a CRM urgently, I'm the decision maker, budget is ready.")
    d = end(lid, cid)
    nba = d.get("lead", {}).get("next_best_action", "")
    ok = bool(nba)
    results.append(("/agent/end has next_best_action", ok, nba))
    icon = PASS if ok else FAIL
    print(f"  {icon} /agent/end has next_best_action")
    print(f"     NBA: {nba}")


# ── Helper ────────────────────────────────────────────────────────────────────

def any_of(fragments: list[str]) -> str:
    """Return first fragment — used as a sentinel; check() handles list via override."""
    return fragments[0]


# Override check to support list of acceptable fragments
_orig_check = check

def check(name: str, nba: str, expected):  # type: ignore[override]
    if isinstance(expected, list):
        ok = any(f.lower() in nba.lower() for f in expected)
        results.append((name, ok, nba))
        icon = PASS if ok else FAIL
        print(f"  {icon} {name}")
        print(f"     NBA: {nba}")
        if not ok:
            print(f"     Expected to contain one of: {expected}")
    else:
        _orig_check(name, nba, expected)


# ── Runner ────────────────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("NEXT BEST ACTION — Agent Integration Tests")
    print("=" * 60)

    tests = [
        test_hot_lead_no_objection,
        test_warm_lead_no_objection,
        test_cold_lead_no_objection,
        test_pricing_objection,
        test_not_urgent_timeline,
        test_approval_objection,
        test_proof_objection,
        test_nba_in_end_response,
    ]

    for t in tests:
        try:
            t()
        except Exception as e:
            name = t.__name__
            results.append((name, False, f"ERROR: {e}"))
            print(f"  {FAIL} {name}: {e}")

    print("\n" + "=" * 60)
    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print(f"Results: {passed}/{total} passed")
    print("=" * 60)
    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    main()
