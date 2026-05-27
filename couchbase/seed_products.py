"""
Seeds mock product catalog documents into the products collection.
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
BUCKET_NAME = os.getenv("COUCHBASE_BUCKET", "workflow_ph")
SEED_SCOPES_RAW = os.getenv("COUCHBASE_SEED_SCOPES", "sales_agent,b2b,b2c")

NOW = datetime.now(timezone.utc).isoformat()

PRODUCTS = [
    {
        "key": "product::lenovo-thinkpad-e14",
        "doc": {
            "type": "product",
            "sku": "LTP-E14-I5-16-512",
            "name": "Lenovo ThinkPad E14",
            "category": "laptop",
            "brand": "Lenovo",
            "price": 58999,
            "currency": "PHP",
            "description": "Business laptop with strong keyboard and durable build for everyday coding and office work.",
            "specs": {"cpu": "Intel i5", "ram": "16GB", "storage": "512GB SSD"},
            "tags": ["business", "coding", "durable"],
            "use_cases": ["programming", "productivity", "office"],
            "stock": 25,
            "created_at": NOW,
            "updated_at": NOW,
        },
    },
    {
        "key": "product::asus-vivobook-15",
        "doc": {
            "type": "product",
            "sku": "ASU-VB15-R5-16-512",
            "name": "ASUS Vivobook 15",
            "category": "laptop",
            "brand": "ASUS",
            "price": 52999,
            "currency": "PHP",
            "description": "Balanced performance laptop with vibrant display and solid battery life.",
            "specs": {"cpu": "Ryzen 5", "ram": "16GB", "storage": "512GB SSD"},
            "tags": ["display", "midrange", "student"],
            "use_cases": ["programming", "school", "content"],
            "stock": 40,
            "created_at": NOW,
            "updated_at": NOW,
        },
    },
    {
        "key": "product::acer-swift-go",
        "doc": {
            "type": "product",
            "sku": "ACR-SWG-I5-16-512",
            "name": "Acer Swift Go",
            "category": "laptop",
            "brand": "Acer",
            "price": 49999,
            "currency": "PHP",
            "description": "Lightweight laptop for mobile users who need reliable daily performance.",
            "specs": {"cpu": "Intel i5", "ram": "16GB", "storage": "512GB SSD"},
            "tags": ["lightweight", "travel", "value"],
            "use_cases": ["programming", "remote work", "travel"],
            "stock": 32,
            "created_at": NOW,
            "updated_at": NOW,
        },
    },
    {
        "key": "product::hp-pavilion-14",
        "doc": {
            "type": "product",
            "sku": "HP-PAV14-I5-8-512",
            "name": "HP Pavilion 14",
            "category": "laptop",
            "brand": "HP",
            "price": 45999,
            "currency": "PHP",
            "description": "Compact laptop with practical performance for office and student workloads.",
            "specs": {"cpu": "Intel i5", "ram": "8GB", "storage": "512GB SSD"},
            "tags": ["compact", "budget", "office"],
            "use_cases": ["office", "school", "general use"],
            "stock": 30,
            "created_at": NOW,
            "updated_at": NOW,
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
        print(f"\nSeeding products in scope '{scope_name}'...")
        scope = bucket.scope(scope_name)
        products_col = scope.collection("products")
        for item in PRODUCTS:
            try:
                products_col.insert(item["key"], item["doc"])
                print(f"  Inserted: {item['doc']['name']}")
            except DocumentExistsException:
                print(f"  Already exists: {item['doc']['name']} (skipped)")

    print("\nSeeding complete.")


if __name__ == "__main__":
    main()
