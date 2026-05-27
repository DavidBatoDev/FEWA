import asyncio
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
SERVER_DIR = ROOT / "server"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from app.models.lead import Lead
from app.services.follow_up import generate_follow_up


class TestFollowUpFormat(unittest.TestCase):
    def test_follow_up_contains_meeting_notes_sections(self):
        lead = Lead(
            company="FastCargo Logistics",
            pain_point="Losing inquiries due to manual tracking",
            recommended_offer="Sales Automation Package",
            next_best_action="Prepare proposal and kickoff",
            conversation_summary="Lead needs CRM automation before peak season.",
            call_slot="Wednesday 2PM (Asia/Manila)",
        )

        async def _run():
            with patch("app.services.follow_up._has_openai_key", return_value=False):
                return await generate_follow_up(lead)

        result = asyncio.run(_run())
        body = result["body"]
        self.assertIn("Conversation Summary:", body)
        self.assertIn("Key Pain Point / Need:", body)
        self.assertIn("Recommended Offer:", body)
        self.assertIn("Discovery Call Schedule:", body)
        self.assertIn("Wednesday 2PM (Asia/Manila)", body)
        self.assertIn("Next Steps:", body)

    def test_follow_up_fallback_when_missing_schedule(self):
        lead = Lead(
            company="Demo Co",
            pain_point="Needs better lead handling",
            recommended_offer="Growth Campaign Package",
            next_best_action="Book discovery call",
            conversation_summary="Lead is interested but wants details.",
            call_slot=None,
        )

        async def _run():
            with patch("app.services.follow_up._has_openai_key", return_value=False):
                return await generate_follow_up(lead)

        result = asyncio.run(_run())
        self.assertIn("Discovery Call Schedule:", result["body"])
        self.assertIn("To be scheduled", result["body"])


if __name__ == "__main__":
    unittest.main()
