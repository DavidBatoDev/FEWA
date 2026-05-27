# Couchbase Setup and CLI Verification (Capella)

This folder contains scripts to bootstrap and verify Couchbase for Workflow PH AI Sales Agent.

## What these scripts do

- `setup_collections.py`
  - Creates scopes from `COUCHBASE_PROVISION_SCOPES` (default: `sales_agent,b2b,b2c`)
  - Creates collections: `campaigns`, `leads`, `products`, `orders`, `conversations`, `offers`, `follow_ups`, `intake_forms`, `lead_context_docs`, `discovery_calls`
  - Creates indexes used by dashboard/API queries
- `seed_offers.py`
  - Inserts the four default offer documents into `offers` for scopes in `COUCHBASE_SEED_SCOPES` (default: `sales_agent,b2b,b2c`)
- `seed_products.py`
  - Inserts a mock B2C product catalog into `products` for scopes in `COUCHBASE_SEED_SCOPES` (default: `sales_agent,b2b,b2c`)

Both scripts are idempotent and safe to re-run.

## Prerequisites

1. Couchbase Capella cluster.
2. Bucket `workflow_ph` created in Capella.
3. `server/.env` configured with connection string and credentials.
4. Backend venv activated with dependencies installed.

## Bootstrap (source of truth)

From repo root:

```powershell
python couchbase/setup_collections.py
python couchbase/seed_offers.py
python couchbase/seed_products.py
```

## cbsh workflow (Windows, Capella)

Use Couchbase Shell (`cbsh`) for operational verification and quick inspection.

### 1) Install cbsh

Follow official install docs:
- https://docs.couchbase.com/cloud/reference/command-line-tools.html
- https://github.com/couchbaselabs/couchbase-shell

### 2) Connect to Capella cluster

Example:

```powershell
cbsh --connstr "couchbases://<your-cluster-endpoint>" -u "<db-username>" -p "<db-password>"
```

### 3) Sanity checks in cbsh

Run these inside `cbsh`:

```sql
buckets
scopes -b workflow_ph
collections -b workflow_ph -s sales_agent
query "SELECT RAW name FROM system:indexes WHERE keyspace_id IN ['leads','conversations','follow_ups']"
collections -b workflow_ph -s b2b
collections -b workflow_ph -s b2c
```

### 4) Query examples (inspection)

```sql
query "SELECT META().id, l.lead_temperature, l.lead_score, l.created_at FROM `workflow_ph`.`sales_agent`.`leads` l ORDER BY l.created_at DESC LIMIT 10"
query "SELECT META().id, l.lead_temperature, l.lead_score, l.created_at FROM `workflow_ph`.`b2b`.`leads` l ORDER BY l.created_at DESC LIMIT 10"
query "SELECT META().id, l.lead_temperature, l.lead_score, l.created_at FROM `workflow_ph`.`b2c`.`leads` l ORDER BY l.created_at DESC LIMIT 10"
query "SELECT META().id, c.lead_id, c.updated_at FROM `workflow_ph`.`sales_agent`.`conversations` c ORDER BY c.updated_at DESC LIMIT 10"
query "SELECT META().id, f.lead_id, f.status, f.created_at FROM `workflow_ph`.`sales_agent`.`follow_ups` f ORDER BY f.created_at DESC LIMIT 10"
```

## Troubleshooting

### Capella network allowlist errors

- Add your current public IP to Capella Allowed IPs.
- Verify you are using `couchbases://` connection string.

### Auth/permission errors

- Confirm DB user has permission to read/write `workflow_ph` and create indexes if running setup.

### Missing scope/collections/indexes

- Re-run `python couchbase/setup_collections.py`.
- Re-check with the `cbsh` sanity commands above.
