import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
SERVER_DIR = ROOT / "server"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

# Keep imports resilient when optional PDF deps are unavailable.
if "fitz" not in sys.modules:
    sys.modules["fitz"] = types.SimpleNamespace(open=lambda *_args, **_kwargs: None)

from app.main import app
from app.models.conversation import Conversation
from app.models.lead import Lead
from app.routes import agent as agent_route


class _ContentAs:
    def __init__(self, doc: dict):
        self._doc = doc

    def __getitem__(self, _):
        return self._doc


class _GetResult:
    def __init__(self, doc: dict):
        self.content_as = _ContentAs(doc)


class _Collection:
    def __init__(self):
        self.docs: dict[str, dict] = {}

    def insert(self, key: str, doc: dict):
        if key in self.docs:
            raise Exception("exists")
        self.docs[key] = dict(doc)

    def get(self, key: str):
        if key not in self.docs:
            raise Exception("not found")
        return _GetResult(dict(self.docs[key]))

    def replace(self, key: str, doc: dict):
        if key not in self.docs:
            raise Exception("not found")
        self.docs[key] = dict(doc)


class TestAgentEndEmailDelivery(unittest.TestCase):
    def setUp(self):
        self.leads = _Collection()
        self.conversations = _Collection()
        self.follow_ups = _Collection()
        self.collections = {
            "leads": self.leads,
            "conversations": self.conversations,
            "follow_ups": self.follow_ups,
        }

        self.lead_id = "lead::test"
        self.conversation_id = "conversation::test"
        self.leads.insert(
            self.lead_id,
            Lead(
                email="lead@example.com",
                company="FastCargo",
                pain_point="Lost inquiries",
                recommended_offer="Sales Automation Package",
                next_best_action="Discovery call booked",
                call_slot="Wednesday 2PM (Asia/Manila)",
                created_at="2026-05-27T00:00:00Z",
                updated_at="2026-05-27T00:00:00Z",
            ).model_dump(),
        )
        self.conversations.insert(
            self.conversation_id,
            Conversation(
                lead_id=self.lead_id,
                transcript=[],
                created_at="2026-05-27T00:00:00Z",
                updated_at="2026-05-27T00:00:00Z",
            ).model_dump(),
        )

        async def _refresh(lead, conversation, mark_in_progress=False):
            return lead, conversation

        async def _summary(_transcript):
            return "Lead needs CRM automation and agreed on next steps."

        async def _follow_up(_lead):
            return {"subject": "Meeting Notes and Next Steps", "body": "Conversation Summary:\n...\nDiscovery Call Schedule:\nWednesday 2PM (Asia/Manila)"}

        def _get_collection(name: str):
            return self.collections[name]

        self._patchers = [
            patch.object(agent_route, "get_collection", side_effect=_get_collection),
            patch.object(agent_route, "refresh_sales_state_from_transcript", side_effect=_refresh),
            patch.object(agent_route, "generate_conversation_summary", side_effect=_summary),
            patch("app.services.follow_up.generate_follow_up", side_effect=_follow_up),
            patch.object(agent_route, "get_active_flow", return_value="b2b"),
        ]
        for p in self._patchers:
            p.start()
        self.client = TestClient(app)

    def tearDown(self):
        for p in reversed(self._patchers):
            p.stop()

    def test_agent_end_email_sent(self):
        with patch.object(
            agent_route,
            "send_b2b_follow_up_email",
            return_value={"success": True, "provider": "smtp", "message_id": "<m1@example.com>", "error": None},
        ):
            res = self.client.post("/agent/end", json={"lead_id": self.lead_id, "conversation_id": self.conversation_id})
        self.assertEqual(res.status_code, 200, res.text)
        body = res.json()
        self.assertEqual(body["email_delivery"]["status"], "sent")
        follow_up = body["follow_up"]
        self.assertEqual(follow_up["delivery_status"], "sent")
        self.assertEqual(follow_up["provider_message_id"], "<m1@example.com>")

    def test_agent_end_email_skipped_no_email(self):
        lead_doc = self.leads.docs[self.lead_id]
        lead_doc["email"] = None
        self.leads.docs[self.lead_id] = lead_doc

        with patch.object(agent_route, "send_b2b_follow_up_email") as send_mock:
            res = self.client.post("/agent/end", json={"lead_id": self.lead_id, "conversation_id": self.conversation_id})
        self.assertEqual(res.status_code, 200, res.text)
        body = res.json()
        self.assertEqual(body["email_delivery"]["status"], "skipped_no_email")
        self.assertEqual(body["follow_up"]["delivery_status"], "skipped_no_email")
        send_mock.assert_not_called()

    def test_agent_end_email_failed_softly(self):
        with patch.object(
            agent_route,
            "send_b2b_follow_up_email",
            return_value={"success": False, "provider": "smtp", "message_id": "<m2@example.com>", "error": "smtp down"},
        ):
            res = self.client.post("/agent/end", json={"lead_id": self.lead_id, "conversation_id": self.conversation_id})
        self.assertEqual(res.status_code, 200, res.text)
        body = res.json()
        self.assertEqual(body["email_delivery"]["status"], "failed")
        self.assertIn("smtp down", body["email_delivery"]["error"])
        self.assertEqual(body["follow_up"]["delivery_status"], "failed")


if __name__ == "__main__":
    unittest.main()
