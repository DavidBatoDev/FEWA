"""
Seeds the 4 default service offer documents into the offers collection.
Run from the repo root with backend/.env credentials in place.
"""
import os
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / "server" / ".env")

from couchbase.auth import PasswordAuthenticator
from couchbase.cluster import Cluster
from couchbase.options import ClusterOptions
from couchbase.exceptions import DocumentExistsException

CONNECTION_STRING = os.getenv("COUCHBASE_CONNECTION_STRING", "")
USERNAME = os.getenv("COUCHBASE_USERNAME", "")
PASSWORD = os.getenv("COUCHBASE_PASSWORD", "")
BUCKET_NAME = os.getenv("COUCHBASE_BUCKET", "fflow_ph")
SCOPE_NAME = os.getenv("COUCHBASE_SCOPE", "sales_agent")

NOW = datetime.now(timezone.utc).isoformat()

OFFERS = [
    {
        "key": "offer::lead-capture-starter",
        "doc": {
            "type": "offer",
            "name": "Lead Capture Starter",
            "description": "Basic landing page, lead form, and simple inquiry tracking for businesses new to digital lead generation.",
            "best_for": [
                "Businesses with no website or lead form",
                "Businesses that need basic inquiry capture",
                "Businesses not yet ready for full automation",
            ],
            "price_range": "Custom pricing",
            "rules": {
                "match_keywords": ["no website", "no form", "basic", "start", "beginning", "simple"],
                "recommended_when": ["no online presence", "first time", "basic needs"],
            },
            "created_at": NOW,
        },
    },
    {
        "key": "offer::growth-campaign-package",
        "doc": {
            "type": "offer",
            "name": "Growth Campaign Package",
            "description": "Lead generation through campaigns, landing pages, and campaign tracking for businesses that need more inquiries.",
            "best_for": [
                "Businesses that need more leads",
                "Businesses launching ads or campaigns",
                "Businesses with clear sales goals but weak marketing execution",
            ],
            "price_range": "Custom pricing",
            "rules": {
                "match_keywords": ["more leads", "more clients", "campaign", "ads", "marketing", "grow"],
                "recommended_when": ["low inquiries", "need more leads", "launching campaign"],
            },
            "created_at": NOW,
        },
    },
    {
        "key": "offer::sales-automation-package",
        "doc": {
            "type": "offer",
            "name": "Sales Automation Package",
            "description": "CRM setup, lead tracking, automated follow-ups, and sales dashboard for businesses losing inquiries due to poor follow-up.",
            "best_for": [
                "Businesses already receiving inquiries",
                "Businesses losing leads because of poor tracking",
                "Businesses needing CRM and follow-up automation",
            ],
            "price_range": "Custom pricing",
            "rules": {
                "match_keywords": ["follow-up", "tracking", "lost leads", "CRM", "manual process", "spreadsheet"],
                "recommended_when": ["clear pain point", "urgent timeline", "poor tracking"],
            },
            "created_at": NOW,
        },
    },
    {
        "key": "offer::enterprise-workflow-package",
        "doc": {
            "type": "offer",
            "name": "Enterprise Workflow Package",
            "description": "Custom CRM, dashboard, integrations, and AI-assisted operations for businesses with complex sales workflows.",
            "best_for": [
                "Businesses with complex sales processes",
                "Businesses needing custom dashboards",
                "Businesses needing integrations and AI-assisted workflows",
            ],
            "price_range": "Custom pricing",
            "rules": {
                "match_keywords": ["custom", "integration", "complex", "dashboard", "enterprise", "workflow", "api"],
                "recommended_when": ["complex process", "need integration", "custom crm", "multiple teams"],
            },
            "created_at": NOW,
        },
    },
]

def _parse_scope_names(raw: str) -> list[str]:
    seen = set()
    scopes: list[str] = []
    for part in raw.split(","):
        value = part.strip()
        if not value or value in seen:
            continue
        seen.add(value)
        scopes.append(value)
    return scopes


def main():
    if not all([CONNECTION_STRING, USERNAME, PASSWORD]):
        print("ERROR: Missing Couchbase credentials. Check backend/.env")
        sys.exit(1)

    print(f"Connecting to {CONNECTION_STRING}...")
    auth = PasswordAuthenticator(USERNAME, PASSWORD)
    cluster = Cluster(CONNECTION_STRING, ClusterOptions(auth))
    cluster.wait_until_ready(timedelta(seconds=15))
    print("Connected.")

    bucket = cluster.bucket(BUCKET_NAME)
    scope_names = _parse_scope_names(SEED_SCOPES_RAW)
    if not scope_names:
        print("ERROR: No scope names configured. Set COUCHBASE_SEED_SCOPES.")
        sys.exit(1)

    for scope_name in scope_names:
        print(f"\nSeeding offers in scope '{scope_name}'...")
        scope = bucket.scope(scope_name)
        offers_col = scope.collection("offers")
        for item in OFFERS:
            try:
                offers_col.insert(item["key"], item["doc"])
                print(f"  Inserted: {item['doc']['name']}")
            except DocumentExistsException:
                print(f"  Already exists: {item['doc']['name']} (skipped)")

    print("\nSeeding complete.")


if __name__ == "__main__":
    main()
