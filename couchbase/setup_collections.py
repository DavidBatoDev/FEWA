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
from couchbase.exceptions import ScopeAlreadyExistsException, CollectionAlreadyExistsException, QueryIndexAlreadyExistsException

CONNECTION_STRING = os.getenv("COUCHBASE_CONNECTION_STRING", "")
USERNAME = os.getenv("COUCHBASE_USERNAME", "")
PASSWORD = os.getenv("COUCHBASE_PASSWORD", "")
BUCKET_NAME = os.getenv("COUCHBASE_BUCKET", "workflow_ph")
SCOPE_NAME = os.getenv("COUCHBASE_SCOPE", "sales_agent")

COLLECTIONS = ["campaigns", "leads", "conversations", "offers", "follow_ups"]

INDEXES = [
    f"CREATE PRIMARY INDEX IF NOT EXISTS ON `{BUCKET_NAME}`.`{SCOPE_NAME}`.`leads`",
    f"CREATE INDEX IF NOT EXISTS idx_leads_temperature ON `{BUCKET_NAME}`.`{SCOPE_NAME}`.`leads`(lead_temperature)",
    f"CREATE INDEX IF NOT EXISTS idx_leads_status ON `{BUCKET_NAME}`.`{SCOPE_NAME}`.`leads`(status)",
    f"CREATE INDEX IF NOT EXISTS idx_leads_created_at ON `{BUCKET_NAME}`.`{SCOPE_NAME}`.`leads`(created_at)",
    f"CREATE INDEX IF NOT EXISTS idx_conversations_lead_id ON `{BUCKET_NAME}`.`{SCOPE_NAME}`.`conversations`(lead_id)",
    f"CREATE INDEX IF NOT EXISTS idx_conversations_objections_norm ON `{BUCKET_NAME}`.`{SCOPE_NAME}`.`conversations`(DISTINCT ARRAY LOWER(TRIM(objection)) FOR objection IN objections END)",
    f"CREATE INDEX IF NOT EXISTS idx_followups_lead_id ON `{BUCKET_NAME}`.`{SCOPE_NAME}`.`follow_ups`(lead_id)",
    f"CREATE INDEX IF NOT EXISTS idx_followups_created_at ON `{BUCKET_NAME}`.`{SCOPE_NAME}`.`follow_ups`(created_at)",
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

    print(f"\nCreating scope '{SCOPE_NAME}'...")
    try:
        mgr.create_scope(SCOPE_NAME)
        print(f"  Scope '{SCOPE_NAME}' created.")
        time.sleep(2)
    except ScopeAlreadyExistsException:
        print(f"  Scope '{SCOPE_NAME}' already exists. Skipping.")

    for col_name in COLLECTIONS:
        print(f"Creating collection '{col_name}'...")
        try:
            from couchbase.management.collections import CollectionSpec
            spec = CollectionSpec(col_name, scope_name=SCOPE_NAME)
            mgr.create_collection(spec)
            print(f"  Collection '{col_name}' created.")
            time.sleep(1)
        except CollectionAlreadyExistsException:
            print(f"  Collection '{col_name}' already exists. Skipping.")

    print("\nWaiting for collections to be ready...")
    time.sleep(5)

    print("\nCreating indexes...")
    for idx_sql in INDEXES:
        try:
            cluster.query(idx_sql).execute()
            print(f"  Index created: {idx_sql[:60]}...")
        except Exception as e:
            if "already exist" in str(e).lower():
                print(f"  Index already exists. Skipping.")
            else:
                print(f"  Warning: {e}")

    print("\nSetup complete.")


if __name__ == "__main__":
    main()
