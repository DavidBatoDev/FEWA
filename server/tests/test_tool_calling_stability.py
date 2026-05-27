import asyncio
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
SERVER_DIR = ROOT / "server"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from app.models.conversation import Conversation
from app.models.lead import Lead
from app.services.agent_tools import execute_agent_tool_calls
from app.services.state_sanitizer import sanitize_conversation_dict, sanitize_lead_dict


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
            raise Exception("Document exists")
        self.docs[key] = dict(doc)

    def get(self, key: str):
        if key not in self.docs:
            raise Exception("Not found")
        return _GetResult(dict(self.docs[key]))

    def replace(self, key: str, doc: dict):
        if key not in self.docs:
            raise Exception("Not found")
        self.docs[key] = dict(doc)


class _Scope:
    def __init__(self, products_col: _Collection):
        self.products_col = products_col

    def query(self, query: str, named_parameters: dict | None = None):
        q = " ".join(query.lower().split())
        if "from `products` as p" in q:
            return [{"id": doc_id, **doc} for doc_id, doc in self.products_col.docs.items()]
        raise AssertionError(f"Unhandled query: {query}")


class TestStateSanitizer(unittest.TestCase):
    def test_sanitize_lead_coerces_invalid_types(self):
        raw = {
            "type": "lead",
            "company": "Acme",
            "budget_readiness": 50000,
            "buying_intent": True,
            "asked_for_proposal": "yes",
            "lead_score": "88",
            "objections": ["price_concern", 123, None],
            "buying_signals": "Urgent",
            "status": "in_progress",
        }
        cleaned = sanitize_lead_dict(raw)
        self.assertEqual(cleaned["budget_readiness"], "50000")
        self.assertEqual(cleaned["buying_intent"], "Yes")
        self.assertTrue(cleaned["asked_for_proposal"])
        self.assertEqual(cleaned["lead_score"], 88)
        self.assertEqual(cleaned["objections"], ["price_concern", "123"])
        self.assertEqual(cleaned["buying_signals"], ["Urgent"])

    def test_sanitize_conversation_coerces_transcript_and_state(self):
        raw = {
            "type": "conversation",
            "lead_id": "lead::1",
            "transcript": [
                {"role": "user", "message": "Hello", "timestamp": "t1"},
                {"role": "assistant", "message": "Hi", "timestamp": "t2"},
                {"role": "tool", "message": "ignore", "timestamp": "t3"},
            ],
            "commerce_state": {
                "preferences": {"budget_max": "60000", "priorities": ["battery", 123]},
                "order_verified": "true",
            },
        }
        cleaned = sanitize_conversation_dict(raw)
        self.assertEqual(len(cleaned["transcript"]), 2)
        self.assertEqual(cleaned["commerce_state"]["preferences"]["budget_max"], 60000.0)
        self.assertTrue(cleaned["commerce_state"]["order_verified"])


class TestAgentToolRuntime(unittest.TestCase):
    def setUp(self):
        self.lead = Lead(created_at="2026-01-01T00:00:00Z", updated_at="2026-01-01T00:00:00Z")
        self.conversation = Conversation(
            lead_id="lead::x",
            created_at="2026-01-01T00:00:00Z",
            updated_at="2026-01-01T00:00:00Z",
        )
        self.calls_col = _Collection()
        self.products_col = _Collection()
        self.orders_col = _Collection()
        self.scope = _Scope(self.products_col)

    def test_generate_follow_up_failure_uses_fallback(self):
        tool_calls = [{"id": "1", "name": "generate_follow_up", "arguments": {}}]

        async def _run():
            with patch("app.services.agent_tools.generate_follow_up", side_effect=Exception("Connection error")):
                return await execute_agent_tool_calls(
                    tool_calls=tool_calls,
                    flow="b2b",
                    lead_id="lead::x",
                    conversation_id="conversation::x",
                    lead=self.lead,
                    conversation=self.conversation,
                    scope=self.scope,
                    calls_col=self.calls_col,
                    products_col=self.products_col,
                    orders_col=self.orders_col,
                )

        fired, _ = asyncio.run(_run())
        self.assertEqual(len(fired), 1)
        self.assertFalse(fired[0]["success"])
        self.assertTrue(fired[0]["output"].get("fallback"))

    def test_b2c_six_tools_sequence_creates_order(self):
        self.products_col.insert(
            "product::laptop-1",
            {
                "type": "product",
                "sku": "LP-1",
                "name": "ThinkPad E14",
                "category": "laptop",
                "brand": "Lenovo",
                "price": 58999,
                "currency": "PHP",
                "description": "Programming laptop",
                "use_cases": ["programming"],
                "tags": ["laptop", "coding"],
            },
        )
        self.products_col.insert(
            "product::laptop-2",
            {
                "type": "product",
                "sku": "LP-2",
                "name": "ASUS Vivobook",
                "category": "laptop",
                "brand": "ASUS",
                "price": 55999,
                "currency": "PHP",
                "description": "General productivity",
                "use_cases": ["programming"],
                "tags": ["laptop"],
            },
        )

        tool_calls = [
            {
                "id": "1",
                "name": "extract_preferences",
                "arguments": {
                    "category": "laptop",
                    "budget_max": 60000,
                    "brand_preference": "Lenovo",
                    "use_case": "programming",
                    "priorities": ["battery", "keyboard"],
                },
            },
            {"id": "2", "name": "search_products", "arguments": {"limit": 3}},
            {"id": "3", "name": "compare_items", "arguments": {}},
            {
                "id": "4",
                "name": "build_order",
                "arguments": {
                    "product_id": "laptop-1",
                    "quantity": 1,
                    "customer_name": "Juan Dela Cruz",
                    "email": "juan@example.com",
                    "phone": "09171234567",
                    "address": "Quezon City",
                },
            },
            {"id": "5", "name": "verify_order", "arguments": {}},
            {"id": "6", "name": "checkout_prep", "arguments": {"confirmed": True, "payment_method": "gcash"}},
        ]

        async def _run():
            return await execute_agent_tool_calls(
                tool_calls=tool_calls,
                flow="b2c",
                lead_id="lead::x",
                conversation_id="conversation::x",
                lead=self.lead,
                conversation=self.conversation,
                scope=self.scope,
                calls_col=self.calls_col,
                products_col=self.products_col,
                orders_col=self.orders_col,
            )

        fired, _ = asyncio.run(_run())
        canonical = [event["canonical_tool"] for event in fired]
        self.assertEqual(
            canonical,
            ["extract_preferences", "search_products", "compare_items", "build_order", "verify_order", "checkout_prep"],
        )
        self.assertEqual(len(self.orders_col.docs), 1)
        checkout_event = fired[-1]
        self.assertTrue(checkout_event["success"])
        self.assertEqual(checkout_event["output"].get("status"), "ready_for_checkout")


if __name__ == "__main__":
    unittest.main()
