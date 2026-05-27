# PDF Extraction Tests

This directory contains test files for the PDF extraction feature.

## Test Files

### Unit Tests
- **test_pdf_extraction.py** - Unit tests for individual extraction functions
  - PDF text extraction with error handling
  - AI-powered business data extraction
  - Hybrid lead field merging strategy

### Integration Tests
- **test_pdf_integration.py** - Integration tests with real PDF files
  - Real PDF text extraction
  - AI extraction with sample business document
  - Field extraction verification

### Direct Function Tests
- **test_direct_functions.py** - Direct function tests without server
  - Complete PDF extraction flow
  - Error handling tests
  - Field merging tests

### API Tests
- **test_api_integration.py** - End-to-end API tests (requires server running)
  - Intake form submission without PDF
  - Intake form submission with PDF
  - Manual extraction endpoint
  - Lead data verification
- **test_db_routes_schema_contract.py** - Route + schema contract checks
  - Includes unit-style mocked DB tests
  - Includes live integration tests against `http://127.0.0.1:8000` for B2B/B2C DB routes
  - Live tests create real `intake_forms`, `leads`, and `orders` records

### Database Population
- **populate_test_data.py** - Populates test data into Couchbase via API calls
  - Creates real database records for testing
  - Tests automatic PDF extraction
  - Tests manual extraction endpoint
  - Verifies data in database

## Running Tests

### Run Unit Tests
```bash
cd server
.venv/bin/python tests/test_pdf_extraction.py
```

### Run Integration Tests
```bash
cd server
.venv/bin/python tests/test_pdf_integration.py
```

### Run Direct Function Tests
```bash
cd server
.venv/bin/python tests/test_direct_functions.py
```

### Run API Tests (requires server running)
```bash
# Terminal 1: Start server
cd server
.venv/bin/python run.py

# Terminal 2: Run tests
cd server
.venv/bin/python tests/test_api_integration.py
```

### Run Live DB Route Contract Tests (requires server running on :8000)
```bash
# Terminal 1
cd server
uvicorn app.main:app --reload --port 8000

# Terminal 2
cd ..
python -m unittest server.tests.test_db_routes_schema_contract.TestDatabaseRouteSchemaContractLiveAPI -v
```

### Populate Test Data into Database
```bash
# Terminal 1: Start server
cd server
.venv/bin/python run.py

# Terminal 2: Populate database
cd server
.venv/bin/python tests/populate_test_data.py
```

This will create:
- 2 intake_forms documents
- 2 leads documents  
- 2 lead_context_docs documents

You can verify the data in Couchbase UI.

## Test Requirements

- pymupdf==1.24.0 (for PDF parsing)
- OpenAI API key (optional, falls back to keyword extraction)
- Test PDF file: `uploads/test-business-doc.pdf`

## Test Results

See `docs/TEST_RESULTS.md` for detailed test results and metrics.
