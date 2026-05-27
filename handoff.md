# Project Handoff Documentation

This document summarizes the current status, implementation details, and verification steps for the B2B Intake Form and Lead Mapping backend implementation.

## Context & Objectives

The goal of this task was to implement the backend requirements from the MVP specification for intake forms, ensuring they capture expanded B2B details, map those details onto the Couchbase `leads` and `intake_forms` collections, and perform immediate scoring and offer recommendations on lead creation.

---

## Completed Implementations

### 1. Schema Expansion
* **Files Modified:** [server/app/routes/intake_forms.py](file:///home/joshuam/CODE/proj/FEWA/server/app/routes/intake_forms.py)
* Expanded `IntakeFormCreateRequest` schema to support the following additional fields:
  * `contact_name: Optional[str]`
  * `target_clients: Optional[str]`
  * `urgency: Optional[str]`
  * `budget_readiness: Optional[str]`
  * `decision_maker: Optional[str]`
  * `preferred_next_step: Optional[str]`
  * `uploaded_pdf_id: Optional[str]`

### 2. Lead Mapping & Couchbase Persistence
* Instantiated the updated `Lead` data model mapping input parameters as follows:
  * `name` $\leftarrow$ `contact_name`
  * `timeline` $\leftarrow$ `urgency`
  * `budget_readiness` $\leftarrow$ `budget_readiness`
  * `decision_maker` $\leftarrow$ `decision_maker`
  * `next_best_action` $\leftarrow$ `preferred_next_step`
  * `context_status` $\leftarrow$ `"pending"` if `uploaded_pdf_id` is supplied, else `"none"`
* Runs on-the-fly lead scoring (`score_lead`) and offer recommendation (`recommend_offer`) during submission.
* Both the raw intake form and the processed lead are inserted into Couchbase.

---

## Verification & Testing

An integration test script has been created to validate the endpoint, Pydantic validation, scoring math delegation, and Couchbase mock database calls.

### How to Run Verification
To run the integration verification test inside the virtual environment:
```bash
cd server
.venv/bin/python /home/joshuam/.gemini/antigravity-cli/brain/d0c0aaa2-40be-4258-8daa-545d27525747/scratch/test_intake.py
```

### Current Test Output
```text
Sending POST /intake-forms request via TestClient...
[offer_recommender] empty_offers_fallback: db returned empty offers set; using defaults
Status Code: 200
Response: {...}
Verifying lead mapping in response...
Verifying insert calls to database...

ALL VERIFICATIONS PASSED SUCCESSFULLY!
```

---

## Git Repository Status

* **Branch:** `dev`
* **Commit:** `feat(backend): expand B2B intake form schema and map fields to Couchbase leads`
* **Status:** Clean. All modifications have been committed and pushed to `origin/dev`.

---

## Recommended Next Steps

1. **Frontend Integration:** Align the frontend form submission schema (captured fields) with the new properties in `IntakeFormCreateRequest`.
2. ~~**PDF Information Extraction:** Once the PDF uploaded hook is fully built out, develop the extraction layer to parse business files corresponding to the `uploaded_pdf_id` and update `context_status` from `"pending"` to `"processed"`.~~ **✅ COMPLETED**
3. **Downstream Actions:** Wire up the UI or webhooks to trigger follow-up action prompts (discovery calls) based on the mapped `next_best_action` / `preferred_next_step` field.

---

## PDF Information Extraction Implementation (COMPLETED)

### Overview
Implemented end-to-end PDF information extraction that automatically processes uploaded business documents during intake form submission, extracts structured business data using AI, and updates lead fields intelligently.

### Components Implemented

#### 1. PDF Extraction Service (`server/app/services/pdf_extractor.py`)
**Functions:**
- `extract_text_from_pdf(file_path: str) -> str`
  - Uses pymupdf (fitz) to extract text from PDF files
  - Handles file not found, corrupted PDFs, and empty documents
  - Returns extracted text or raises appropriate exceptions

- `extract_business_data_from_text(text: str) -> dict`
  - Uses OpenAI GPT-4o-mini to extract structured business information
  - Returns `{"summary": str, "fields": dict}` with company, industry, pain points, timeline, budget, decision maker, etc.
  - Includes fallback keyword-based extraction when OpenAI is unavailable
  
- `merge_lead_fields(current_lead: Lead, extracted_fields: dict) -> dict`
  - Implements hybrid merge strategy: only updates empty/null lead fields
  - Preserves existing non-empty values
  - Returns dict of fields to update

- `process_pdf_extraction(file_path: str, lead_id: str) -> dict`
  - End-to-end orchestrator for PDF extraction workflow
  - Handles: text extraction → AI extraction → context_doc creation → lead field updates
  - Comprehensive fallback strategy for each failure point
  - Returns extraction result with status, summary, fields, and errors

#### 2. Automatic Extraction on Intake Form Submission
**Modified:** `server/app/routes/intake_forms.py`
- Automatically triggers PDF extraction when `uploaded_pdf_id` is provided
- Maps `uploaded_pdf_id` to file path: `uploads/{uploaded_pdf_id}.pdf`
- Calls `process_pdf_extraction` after lead creation
- Refreshes lead data after extraction completes
- Handles extraction errors gracefully without blocking form submission
- Returns extraction result in API response

#### 3. Manual Extraction Endpoint
**Added:** `POST /leads/{lead_id}/extract-pdf` in `server/app/routes/leads.py`
- Accepts `{"file_path": "path/to/file.pdf"}` in request body
- Verifies lead exists before extraction
- Calls `process_pdf_extraction` and returns result
- Allows manual re-extraction for failed or pending extractions

#### 4. Dependencies
**Updated:** `server/requirements.txt`
- Added `pymupdf==1.24.0` for PDF text extraction

### Extraction Workflow

```
Intake Form Submission (with uploaded_pdf_id)
    ↓
1. Create Lead with context_status="pending"
    ↓
2. Map uploaded_pdf_id to file path
    ↓
3. Extract text from PDF using pymupdf
    ↓
4. Extract structured business data using OpenAI
    ↓
5. Create lead_context_doc with extraction results
    ↓
6. Update lead fields (only empty fields) + context_status="processed"
    ↓
7. Return response with extraction results
```

### Fallback Strategy

| Failure Point | Fallback Behavior |
|--------------|-------------------|
| File not found | Set `context_status="failed"`, create context_doc with error, don't block submission |
| PDF parsing error | Set `context_status="failed"`, store error details, don't block submission |
| Empty PDF | Set `context_status="processed"`, note "no extractable text" |
| OpenAI unavailable | Use keyword-based extraction, set `context_status="processed"` with partial data |
| AI extraction fails | Use raw text summary, set `context_status="processed"` with text preview |

### Extracted Fields

The AI extraction identifies and extracts:
- **company**: Company name
- **industry**: Industry or business sector
- **pain_point**: Main business problem or challenge
- **timeline**: Urgency or timeline (e.g., "This month", "Q2 2026")
- **budget_readiness**: Budget information (e.g., "₱500k allocated", "Open to proposal")
- **decision_maker**: Decision maker information or role
- **buying_intent**: Level of buying intent (High/Medium/Low)
- **target_clients**: Target clients or market
- **current_solution**: Current solution or tools in use

### Testing

**Test Script:** `server/test_pdf_extraction.py`

Run tests:
```bash
cd server
.venv/bin/python test_pdf_extraction.py
```

**Test Results:**
- ✅ PDF text extraction with error handling
- ✅ AI-powered business data extraction
- ✅ Hybrid lead field merging strategy
- ✅ All components working correctly

### Usage Examples

**Automatic Extraction (Intake Form):**
```bash
POST /intake-forms
{
  "company_name": "ABC Corp",
  "email": "contact@abc.com",
  "pain_points": ["Lead tracking"],
  "uploaded_pdf_id": "doc123"  # Triggers extraction
}
```

**Manual Extraction:**
```bash
POST /leads/{lead_id}/extract-pdf
{
  "file_path": "uploads/business-proposal.pdf"
}
```

### Next Steps for PDF Extraction

1. **File Upload Endpoint:** Create `POST /upload` endpoint to handle PDF file uploads and return `uploaded_pdf_id`
2. **Frontend Integration:** Build file upload UI component in intake form
3. **Storage Configuration:** Configure persistent storage for uploaded PDFs (local filesystem or cloud storage)
4. **Monitoring:** Add logging and monitoring for extraction success/failure rates
5. **Retry Mechanism:** Implement automatic retry for failed extractions

---
