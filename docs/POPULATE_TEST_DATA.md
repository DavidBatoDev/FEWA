# Quick Start: Populate Test Data

This guide shows you how to populate your Couchbase database with test data using the PDF extraction feature.

## Prerequisites

1. **Couchbase is running** and configured in `.env`
2. **Collections are set up** (run `couchbase/setup_collections.py`)
3. **Test PDF exists** at `server/uploads/test-business-doc.pdf`

## Step 1: Start the Server

```bash
cd server
.venv/bin/python run.py
```

Keep this terminal running.

## Step 2: Run the Population Script

In a new terminal:

```bash
cd server
.venv/bin/python tests/populate_test_data.py
```

## What Gets Created

The script will create **6 documents** in your Couchbase database:

### 1. Two Intake Forms (`intake_forms` collection)

**Intake 1:** Without PDF
- Company: Baseline Test Company
- Email: baseline@test.com
- No PDF extraction

**Intake 2:** With PDF (triggers extraction)
- Company: XYZ Manufacturing
- Email: contact@xyzmanufacturing.com
- PDF: test-business-doc.pdf

### 2. Two Leads (`leads` collection)

**Lead 1:** Basic lead (no PDF data)
- From intake form 1
- Basic scoring only

**Lead 2:** Enhanced lead (with PDF data)
- From intake form 2
- Enriched with extracted data:
  - Industry: Manufacturing
  - Pain Point: Inefficient lead qualification
  - Timeline: Q2 2026
  - Budget: ₱750,000
  - Decision Maker: Maria Santos, VP of Sales
  - Buying Intent: High

### 3. Two Context Documents (`lead_context_docs` collection)

**Context Doc 1:** From manual extraction
- Linked to Lead 1
- Extraction status: processed
- Contains extracted business data

**Context Doc 2:** From automatic extraction
- Linked to Lead 2
- Extraction status: processed
- Contains extracted business data

## Verify in Couchbase

1. Open Couchbase UI (usually http://localhost:8091)
2. Navigate to: Buckets → `workflow_ph` → Scopes → `sales_agent` (or your configured scope)
3. Check each collection:
   - `intake_forms` - Should have 2 new documents
   - `leads` - Should have 2 new documents
   - `lead_context_docs` - Should have 2 new documents

## Expected Output

```
======================================================================
  PDF EXTRACTION - DATABASE POPULATION TEST
======================================================================

Target: http://localhost:8000
This script will create real records in your Couchbase database.

======================================================================
  Testing Server Connection
======================================================================

✅ Server is running and accessible

======================================================================
  Test 1: Create Intake Form WITHOUT PDF
======================================================================

✅ Intake form created successfully

📊 Created Records:
   Lead ID: lead::uuid
   Intake ID: intake::uuid
   Context Status: none
   Lead Score: 50
   Lead Temperature: Warm

======================================================================
  Test 2: Create Intake Form WITH PDF (Auto Extraction)
======================================================================

✓ Test PDF found: uploads/test-business-doc.pdf

⏳ Processing... (PDF extraction may take 3-5 seconds)

✅ Intake form created with PDF extraction

📊 Created Records:
   Lead ID: lead::uuid
   Intake ID: intake::uuid

👤 Lead Information:
   Company: XYZ Manufacturing
   Industry: Manufacturing
   Pain Point: Inefficient lead qualification process
   Timeline: Urgent - need to implement within this quarter (Q2 2026)
   Budget: ₱750,000 allocated
   Decision Maker: Maria Santos, VP of Sales
   Context Status: processed
   Lead Score: 90
   Lead Temperature: Hot

📄 PDF Extraction Results:
   Status: processed
   Context Doc ID: context::uuid
   Fields Extracted: 9
   Lead Fields Updated: 6

======================================================================
  SUMMARY
======================================================================

📊 Database Records Created:
   • 2 intake_forms documents
   • 2 leads documents
   • 2 lead_context_docs documents (from PDF extractions)

✅ Test data population complete!
```

## Troubleshooting

### Server not running
```
❌ Cannot connect to server: Connection refused
💡 Make sure the server is running:
   cd server && .venv/bin/python run.py
```

**Solution:** Start the server in another terminal.

### Test PDF not found
```
❌ Test PDF not found: uploads/test-business-doc.pdf
💡 The test PDF should be at: server/uploads/test-business-doc.pdf
```

**Solution:** The PDF should already exist. If not, run:
```bash
cd server
.venv/bin/python tests/test_pdf_integration.py
```

### Couchbase connection error
```
❌ Failed with status 503
Error: Couchbase error: ...
```

**Solution:** 
1. Check Couchbase is running
2. Verify `.env` credentials
3. Run setup script: `python couchbase/setup_collections.py`

## Clean Up Test Data

To remove test data from your database, use Couchbase UI:

1. Go to Query tab
2. Run:
```sql
DELETE FROM `workflow_ph`.`sales_agent`.`intake_forms` 
WHERE email IN ('baseline@test.com', 'contact@xyzmanufacturing.com');

DELETE FROM `workflow_ph`.`sales_agent`.`leads` 
WHERE email IN ('baseline@test.com', 'contact@xyzmanufacturing.com');

DELETE FROM `workflow_ph`.`sales_agent`.`lead_context_docs` 
WHERE lead_id IN (
  SELECT META().id FROM `workflow_ph`.`sales_agent`.`leads` 
  WHERE email IN ('baseline@test.com', 'contact@xyzmanufacturing.com')
);
```

Or delete individual documents by ID in the Couchbase UI.
