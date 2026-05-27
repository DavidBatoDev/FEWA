import sys
import unittest
from pathlib import Path
from unittest.mock import patch
import types
import uuid
import os

import httpx
from couchbase.auth import PasswordAuthenticator
from couchbase.cluster import Cluster
from couchbase.options import ClusterOptions
from dotenv import dotenv_values

from fastapi.testclient import TestClient


ROOT = Path(__file__).resolve().parents[2]
SERVER_DIR = ROOT / "server"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

# Keep DB route tests independent from optional PDF dependencies.
if "fitz" not in sys.modules:
    sys.modules["fitz"] = types.SimpleNamespace(open=lambda *_args, **_kwargs: None)

from app.main import app
from app.models.lead import Lead
from app.models.order import Order
from app.models.product import Product
from app.routes import intake_forms as intake_forms_route
from app.routes import leads as leads_route
from app.routes import orders as orders_route
from app.routes import products as products_route


class _ContentAs:
    def __init__(self, doc: dict):
        self._doc = doc

    def __getitem__(self, _):
        return self._doc


class _FakeGetResult:
    def __init__(self, doc: dict):
        self.content_as = _ContentAs(doc)


class _FakeCollection:
    def __init__(self, store: dict):
        self.store = store

    def insert(self, key: str, doc: dict):
        if key in self.store:
            raise Exception("Document exists")
        self.store[key] = dict(doc)

    def get(self, key: str):
        if key not in self.store:
            raise Exception("Not found")
        return _FakeGetResult(dict(self.store[key]))

    def replace(self, key: str, doc: dict):
        if key not in self.store:
            raise Exception("Not found")
        self.store[key] = dict(doc)


class _FakeScope:
    def __init__(self, db: dict[str, dict[str, dict]]):
        self.db = db

    def query(self, query: str, named_parameters: dict | None = None):
        named_parameters = named_parameters or {}
        q = " ".join(query.lower().split())

        if "from `intake_forms`" in q and "count(1)" in q:
            email = str(named_parameters.get("email", "")).strip().lower()
            count = 0
            for doc in self.db["intake_forms"].values():
                if str(doc.get("email", "")).strip().lower() == email:
                    count += 1
            return [{"count": count}]

        if "from `conversations` as c" in q:
            lead_id = named_parameters.get("lead_id")
            rows = []
            for doc_id, doc in self.db["conversations"].items():
                if doc.get("lead_id") == lead_id:
                    rows.append({"id": doc_id, **doc})
            rows.sort(key=lambda d: (d.get("updated_at", ""), d.get("created_at", "")), reverse=True)
            return rows[:1]

        if "from `follow_ups` as f" in q:
            lead_id = named_parameters.get("lead_id")
            rows = []
            for doc_id, doc in self.db["follow_ups"].items():
                if doc.get("lead_id") == lead_id:
                    rows.append({"id": doc_id, **doc})
            rows.sort(key=lambda d: d.get("created_at", ""), reverse=True)
            return rows[:1]

        if "from `products` as p" in q and "where meta(p).id in $ids" in q:
            wanted = set(named_parameters.get("ids") or [])
            out = []
            for doc_id, doc in self.db["products"].items():
                if doc_id in wanted:
                    out.append({"id": doc_id, **doc})
            return out

        if "from `products` as p" in q:
            rows = [{"id": doc_id, **doc} for doc_id, doc in self.db["products"].items()]
            rows.sort(key=lambda d: d.get("created_at", ""), reverse=True)
            limit = int(named_parameters.get("limit", 200))
            return rows[:limit]

        if "from `orders` as o" in q:
            rows = [{"id": doc_id, **doc} for doc_id, doc in self.db["orders"].items()]
            rows.sort(key=lambda d: d.get("created_at", ""), reverse=True)
            limit = int(named_parameters.get("limit", 200))
            if "where o.status = $status" in q:
                status = named_parameters.get("status")
                rows = [r for r in rows if r.get("status") == status]
            return rows[:limit]

        raise AssertionError(f"Unhandled query in test double: {query}")


class TestDatabaseRouteSchemaContract(unittest.TestCase):
    def setUp(self):
        self.db = {
            "leads": {},
            "conversations": {},
            "follow_ups": {},
            "products": {},
            "orders": {},
            "intake_forms": {},
            "lead_context_docs": {},
            "discovery_calls": {},
            "campaigns": {},
            "offers": {},
        }
        self.scope = _FakeScope(self.db)

        def fake_get_collection(name: str):
            return _FakeCollection(self.db[name])

        def fake_get_scope():
            return self.scope

        self._patchers = [
            patch.object(intake_forms_route, "get_collection", side_effect=fake_get_collection),
            patch.object(intake_forms_route, "get_scope", side_effect=fake_get_scope),
            patch.object(intake_forms_route, "recommend_offer", return_value="Sales Automation Package"),
            patch.object(leads_route, "get_collection", side_effect=fake_get_collection),
            patch.object(leads_route, "get_scope", side_effect=fake_get_scope),
            patch.object(products_route, "get_scope", side_effect=fake_get_scope),
            patch.object(orders_route, "get_collection", side_effect=fake_get_collection),
            patch.object(orders_route, "get_scope", side_effect=fake_get_scope),
        ]
        for p in self._patchers:
            p.start()
        self.client = TestClient(app)

    def tearDown(self):
        for p in reversed(self._patchers):
            p.stop()

    def test_post_intake_forms_returns_complete_lead_schema_fields(self):
        payload = {
            "company_name": "Workflow PH",
            "company_description": "Automation agency",
            "email": "owner@workflow.ph",
            "pain_points": ["manual follow up", "no crm"],
            "contact_name": "Juan Dela Cruz",
        }
        res = self.client.post("/intake-forms", json=payload, headers={"x-sales-flow": "b2b"})
        self.assertEqual(res.status_code, 200, res.text)

        body = res.json()
        self.assertIn("lead", body)
        self.assertIn("intake_form", body)

        lead = body["lead"]
        expected_fields = set(Lead.model_fields.keys()) | {"id"}
        self.assertTrue(expected_fields.issubset(set(lead.keys())))
        self.assertTrue(str(lead["id"]).startswith("lead::"))
        self.assertTrue(str(lead["intake_form_id"]).startswith("intake::"))

    def test_get_lead_returns_lead_plus_latest_conversation_and_follow_up(self):
        lead_id = "lead::123"
        self.db["leads"][lead_id] = Lead(
            name="Maria",
            email="maria@test.com",
            company="Test Co",
            created_at="2026-05-27T00:00:00Z",
            updated_at="2026-05-27T00:00:00Z",
        ).model_dump()

        self.db["conversations"]["convo::older"] = {
            "type": "conversation",
            "lead_id": lead_id,
            "transcript": [],
            "summary": "old",
            "objections": [],
            "buying_signals": [],
            "created_at": "2026-05-26T00:00:00Z",
            "updated_at": "2026-05-26T00:00:00Z",
        }
        self.db["conversations"]["convo::latest"] = {
            "type": "conversation",
            "lead_id": lead_id,
            "transcript": [],
            "summary": "latest",
            "objections": ["price concern"],
            "buying_signals": ["asked for demo"],
            "created_at": "2026-05-27T00:00:00Z",
            "updated_at": "2026-05-27T01:00:00Z",
        }
        self.db["follow_ups"]["followup::latest"] = {
            "type": "follow_up",
            "lead_id": lead_id,
            "subject": "Next steps",
            "body": "Here are next steps",
            "status": "draft",
            "created_at": "2026-05-27T02:00:00Z",
        }

        res = self.client.get(f"/leads/{lead_id}", headers={"x-sales-flow": "b2b"})
        self.assertEqual(res.status_code, 200, res.text)
        body = res.json()

        expected_lead_fields = set(Lead.model_fields.keys()) | {"id", "conversation", "follow_up"}
        self.assertTrue(expected_lead_fields.issubset(set(body.keys())))
        self.assertEqual(body["conversation"]["id"], "convo::latest")
        self.assertEqual(body["conversation"]["summary"], "latest")
        self.assertEqual(body["follow_up"]["id"], "followup::latest")

    def test_get_products_returns_complete_product_schema_fields(self):
        self.db["products"]["product::p1"] = Product(
            sku="SKU-1",
            name="Workflow CRM",
            category="crm",
            brand="Workflow",
            price=19999.0,
            description="CRM and automation",
            tags=["crm", "automation"],
            use_cases=["lead tracking"],
            stock=10,
            created_at="2026-05-27T00:00:00Z",
            updated_at="2026-05-27T00:00:00Z",
        ).model_dump()

        res = self.client.get("/products", headers={"x-sales-flow": "b2c"})
        self.assertEqual(res.status_code, 200, res.text)
        body = res.json()
        self.assertIn("products", body)
        self.assertEqual(len(body["products"]), 1)

        product = body["products"][0]
        expected_fields = set(Product.model_fields.keys()) | {"id"}
        self.assertTrue(expected_fields.issubset(set(product.keys())))
        self.assertEqual(product["id"], "product::p1")

    def test_post_orders_returns_complete_order_schema_fields(self):
        self.db["products"]["product::sku-100"] = Product(
            sku="SKU-100",
            name="Sales Automation Package",
            category="automation",
            brand="Workflow",
            price=50000.0,
            description="Automation package",
            tags=["sales"],
            use_cases=["follow-up"],
            stock=50,
            created_at="2026-05-27T00:00:00Z",
            updated_at="2026-05-27T00:00:00Z",
        ).model_dump()

        payload = {
            "customer_name": "Ana Cruz",
            "email": "ana@company.com",
            "address": "Makati City",
            "items": [{"product_id": "sku-100", "quantity": 2}],
            "notes": "Please prioritize delivery",
        }
        res = self.client.post("/orders", json=payload, headers={"x-sales-flow": "b2c"})
        self.assertEqual(res.status_code, 200, res.text)
        body = res.json()

        expected_fields = set(Order.model_fields.keys()) | {"id"}
        self.assertTrue(expected_fields.issubset(set(body.keys())))
        self.assertEqual(body["amount"], 100000.0)
        self.assertEqual(body["status"], "awaiting_payment")
        self.assertEqual(len(body["items"]), 1)


class TestDatabaseRouteSchemaContractLiveAPI(unittest.TestCase):
    BASE_URL = os.getenv("BACKEND_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
    _cluster = None
    _bucket = None
    _scope_b2b = "b2b"
    _scope_b2c = "b2c"

    @classmethod
    def setUpClass(cls):
        try:
            res = httpx.get(f"{cls.BASE_URL}/health", timeout=5.0)
            if res.status_code != 200:
                raise RuntimeError(f"Health check returned {res.status_code}: {res.text}")
        except Exception as exc:
            raise RuntimeError(
                f"Backend server is not reachable at {cls.BASE_URL}. "
                "Start it first (example: `uvicorn app.main:app --reload --port 8000`)."
            ) from exc

        env = dotenv_values(ROOT / "server" / ".env")
        conn = env.get("COUCHBASE_CONNECTION_STRING", "")
        user = env.get("COUCHBASE_USERNAME", "")
        password = env.get("COUCHBASE_PASSWORD", "")
        bucket = env.get("COUCHBASE_BUCKET", "workflow_ph")
        cls._scope_b2b = env.get("COUCHBASE_SCOPE_B2B", "b2b")
        cls._scope_b2c = env.get("COUCHBASE_SCOPE_B2C", "b2c")

        if conn and user and password:
            cls._cluster = Cluster(conn, ClusterOptions(PasswordAuthenticator(user, password)))
            cls._bucket = bucket

    @staticmethod
    def _flow_headers(flow: str) -> dict:
        return {"x-sales-flow": flow}

    @classmethod
    def _count_leads_by_email_in_scope(cls, scope_name: str, email: str) -> int:
        if cls._cluster is None:
            raise RuntimeError("Couchbase not configured for scope verification in test environment.")
        q = f"""
        SELECT RAW COUNT(1)
        FROM `{cls._bucket}`.`{scope_name}`.`leads` AS l
        WHERE LOWER(TRIM(l.email)) = $email
        """
        rows = list(cls._cluster.query(q, named_parameters={"email": email.strip().lower()}))
        return int(rows[0] if rows else 0)

    def test_live_b2b_intake_and_lead_detail_schema(self):
        marker = uuid.uuid4().hex[:8]
        payload = {
            "company_name": f"Schema Test Co {marker}",
            "company_description": "Live integration schema test",
            "email": f"schema-{marker}@example.com",
            "pain_points": ["manual follow-up", "no lead tracking"],
            "contact_name": "Schema Tester",
        }

        create_res = httpx.post(
            f"{self.BASE_URL}/intake-forms",
            json=payload,
            headers=self._flow_headers("b2b"),
            timeout=15.0,
        )
        self.assertEqual(create_res.status_code, 200, create_res.text)
        create_body = create_res.json()

        self.assertIn("lead", create_body)
        self.assertIn("intake_form", create_body)
        lead = create_body["lead"]
        expected_lead_fields = set(Lead.model_fields.keys()) | {"id"}
        self.assertTrue(expected_lead_fields.issubset(set(lead.keys())))

        lead_id = lead["id"]
        detail_res = httpx.get(
            f"{self.BASE_URL}/leads/{lead_id}",
            headers=self._flow_headers("b2b"),
            timeout=10.0,
        )
        self.assertEqual(detail_res.status_code, 200, detail_res.text)
        detail = detail_res.json()
        expected_detail_fields = set(Lead.model_fields.keys()) | {"id", "conversation", "follow_up"}
        self.assertTrue(expected_detail_fields.issubset(set(detail.keys())))

    def test_live_b2b_scope_isolation_write_goes_to_b2b_not_b2c(self):
        if self.__class__._cluster is None:
            self.skipTest("Couchbase credentials missing; skipping direct scope verification test.")

        marker = uuid.uuid4().hex[:10]
        email = f"scope-b2b-{marker}@example.com"
        payload = {
            "company_name": f"B2B Scope Test {marker}",
            "company_description": "Scope routing verification",
            "email": email,
            "pain_points": ["manual process"],
            "contact_name": "Scope Tester",
        }

        before_b2b = self._count_leads_by_email_in_scope(self._scope_b2b, email)
        before_b2c = self._count_leads_by_email_in_scope(self._scope_b2c, email)

        create_res = httpx.post(
            f"{self.BASE_URL}/intake-forms",
            json=payload,
            headers=self._flow_headers("b2b"),
            timeout=15.0,
        )
        self.assertEqual(create_res.status_code, 200, create_res.text)

        after_b2b = self._count_leads_by_email_in_scope(self._scope_b2b, email)
        after_b2c = self._count_leads_by_email_in_scope(self._scope_b2c, email)

        self.assertEqual(after_b2b, before_b2b + 1, "Expected one new B2B lead record.")
        self.assertEqual(after_b2c, before_b2c, "B2C scope should not receive this B2B write.")

    def test_live_b2c_products_schema(self):
        res = httpx.get(
            f"{self.BASE_URL}/products",
            headers=self._flow_headers("b2c"),
            timeout=10.0,
        )
        self.assertEqual(res.status_code, 200, res.text)
        body = res.json()
        self.assertIn("products", body)
        self.assertTrue(
            len(body["products"]) > 0,
            "No products found in b2c scope. Run `python couchbase/seed_products.py` first.",
        )

        product = body["products"][0]
        expected_product_fields = set(Product.model_fields.keys()) | {"id"}
        self.assertTrue(expected_product_fields.issubset(set(product.keys())))

    def test_live_b2c_create_order_schema(self):
        products_res = httpx.get(
            f"{self.BASE_URL}/products",
            headers=self._flow_headers("b2c"),
            timeout=10.0,
        )
        self.assertEqual(products_res.status_code, 200, products_res.text)
        products = products_res.json().get("products", [])
        self.assertTrue(
            len(products) > 0,
            "No products found in b2c scope. Run `python couchbase/seed_products.py` first.",
        )
        product_id = products[0]["id"]

        marker = uuid.uuid4().hex[:8]
        payload = {
            "customer_name": f"Order Tester {marker}",
            "email": f"order-{marker}@example.com",
            "phone": "09171234567",
            "address": "Makati City",
            "items": [{"product_id": product_id, "quantity": 1}],
            "notes": "Live schema contract test",
        }
        create_order_res = httpx.post(
            f"{self.BASE_URL}/orders",
            json=payload,
            headers=self._flow_headers("b2c"),
            timeout=15.0,
        )
        self.assertEqual(create_order_res.status_code, 200, create_order_res.text)
        order = create_order_res.json()

        expected_order_fields = set(Order.model_fields.keys()) | {"id"}
        self.assertTrue(expected_order_fields.issubset(set(order.keys())))
        self.assertGreater(float(order.get("amount", 0)), 0.0)
        self.assertTrue(len(order.get("items", [])) > 0)


if __name__ == "__main__":
    unittest.main()
