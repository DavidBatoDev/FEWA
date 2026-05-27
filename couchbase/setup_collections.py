"""
One-time setup script: creates scope, collections, and indexes in Couchbase.
Run from the repo root with backend/.env credentials in place.
"""
import os
import sys
import time
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / "server" / ".env")

from couchbase.auth import PasswordAuthenticator
from couchbase.cluster import Cluster
from couchbase.options import ClusterOptions
from couchbase.exceptions import ScopeAlreadyExistsException, CollectionAlreadyExistsException

CONNECTION_STRING = os.getenv("COUCHBASE_CONNECTION_STRING", "")
USERNAME = os.getenv("COUCHBASE_USERNAME", "")
PASSWORD = os.getenv("COUCHBASE_PASSWORD", "")
BUCKET_NAME = os.getenv("COUCHBASE_BUCKET", "workflow_ph")
SCOPE_NAMES_RAW = os.getenv("COUCHBASE_PROVISION_SCOPES", "sales_agent,b2b,b2c")

COLLECTIONS = [
    "campaigns",
    "leads",
    "conversations",
    "offers",
    "follow_ups",
    "intake_forms",
    "lead_context_docs",
    "discovery_calls",
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


def _indexes_for_scope(scope_name: str) -> list[str]:
    return [
        f"CREATE PRIMARY INDEX IF NOT EXISTS ON `{BUCKET_NAME}`.`{scope_name}`.`leads`",
        f"CREATE INDEX IF NOT EXISTS idx_leads_temperature ON `{BUCKET_NAME}`.`{scope_name}`.`leads`(lead_temperature)",
        f"CREATE INDEX IF NOT EXISTS idx_leads_status ON `{BUCKET_NAME}`.`{scope_name}`.`leads`(status)",
        f"CREATE INDEX IF NOT EXISTS idx_leads_created_at ON `{BUCKET_NAME}`.`{scope_name}`.`leads`(created_at)",
        f"CREATE INDEX IF NOT EXISTS idx_conversations_lead_id ON `{BUCKET_NAME}`.`{scope_name}`.`conversations`(lead_id)",
        f"CREATE INDEX IF NOT EXISTS idx_conversations_lead_latest ON `{BUCKET_NAME}`.`{scope_name}`.`conversations`(lead_id, updated_at DESC, created_at DESC)",
        f"CREATE INDEX IF NOT EXISTS idx_conversations_objections_norm ON `{BUCKET_NAME}`.`{scope_name}`.`conversations`(DISTINCT ARRAY LOWER(TRIM(objection)) FOR objection IN objections END)",
        f"CREATE INDEX IF NOT EXISTS idx_followups_lead_id ON `{BUCKET_NAME}`.`{scope_name}`.`follow_ups`(lead_id)",
        f"CREATE INDEX IF NOT EXISTS idx_followups_lead_latest ON `{BUCKET_NAME}`.`{scope_name}`.`follow_ups`(lead_id, created_at DESC)",
        f"CREATE INDEX IF NOT EXISTS idx_followups_created_at ON `{BUCKET_NAME}`.`{scope_name}`.`follow_ups`(created_at)",
        f"CREATE INDEX IF NOT EXISTS idx_intake_forms_created_at ON `{BUCKET_NAME}`.`{scope_name}`.`intake_forms`(created_at)",
        f"CREATE INDEX IF NOT EXISTS idx_intake_forms_email ON `{BUCKET_NAME}`.`{scope_name}`.`intake_forms`(email)",
        f"CREATE INDEX IF NOT EXISTS idx_intake_forms_status ON `{BUCKET_NAME}`.`{scope_name}`.`intake_forms`(status)",
        f"CREATE INDEX IF NOT EXISTS idx_intake_forms_lead_id ON `{BUCKET_NAME}`.`{scope_name}`.`intake_forms`(lead_id)",
        f"CREATE INDEX IF NOT EXISTS idx_context_docs_lead_created ON `{BUCKET_NAME}`.`{scope_name}`.`lead_context_docs`(lead_id, created_at DESC)",
        f"CREATE INDEX IF NOT EXISTS idx_context_docs_status ON `{BUCKET_NAME}`.`{scope_name}`.`lead_context_docs`(extraction_status)",
        f"CREATE INDEX IF NOT EXISTS idx_discovery_calls_lead_created ON `{BUCKET_NAME}`.`{scope_name}`.`discovery_calls`(lead_id, created_at DESC)",
        f"CREATE INDEX IF NOT EXISTS idx_discovery_calls_status ON `{BUCKET_NAME}`.`{scope_name}`.`discovery_calls`(status)",
        f"CREATE INDEX IF NOT EXISTS idx_discovery_calls_slot_start ON `{BUCKET_NAME}`.`{scope_name}`.`discovery_calls`(slot_start)",
        f"CREATE INDEX IF NOT EXISTS idx_discovery_calls_conversation_id ON `{BUCKET_NAME}`.`{scope_name}`.`discovery_calls`(conversation_id)",
    ]


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
    mgr = bucket.collections()

    scope_names = _parse_scope_names(SCOPE_NAMES_RAW)
    if not scope_names:
        print("ERROR: No scope names configured. Set COUCHBASE_PROVISION_SCOPES.")
        sys.exit(1)

    for scope_name in scope_names:
        print(f"\nCreating scope '{scope_name}'...")
        try:
            mgr.create_scope(scope_name)
            print(f"  Scope '{scope_name}' created.")
            time.sleep(2)
        except ScopeAlreadyExistsException:
            print(f"  Scope '{scope_name}' already exists. Skipping.")

        for col_name in COLLECTIONS:
            print(f"Creating collection '{scope_name}.{col_name}'...")
            try:
                from couchbase.management.collections import CollectionSpec
                spec = CollectionSpec(col_name, scope_name=scope_name)
                mgr.create_collection(spec)
                print(f"  Collection '{scope_name}.{col_name}' created.")
                time.sleep(1)
            except CollectionAlreadyExistsException:
                print(f"  Collection '{scope_name}.{col_name}' already exists. Skipping.")

    print("\nWaiting for collections to be ready...")
    time.sleep(5)

    print("\nCreating indexes...")
    for scope_name in scope_names:
        print(f"\nCreating indexes for scope '{scope_name}'...")
        for idx_sql in _indexes_for_scope(scope_name):
            try:
                cluster.query(idx_sql).execute()
                print(f"  Index created: {idx_sql[:70]}...")
            except Exception as e:
                if "already exist" in str(e).lower():
                    print("  Index already exists. Skipping.")
                else:
                    print(f"  Warning: {e}")

    print("\nSetup complete.")


if __name__ == "__main__":
    main()
