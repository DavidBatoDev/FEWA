# PDF Information Extraction - Implementation Guide

## Overview

The PDF information extraction feature automatically processes uploaded business documents during intake form submission, extracts structured business data using AI (OpenAI GPT-4o-mini), and intelligently updates lead fields.

## Features

✅ **Automatic Extraction** - Triggers on intake form submission when `uploaded_pdf_id` is provided  
✅ **AI-Powered** - Uses OpenAI to extract structured business information  
✅ **Hybrid Field Updates** - Only updates empty lead fields, preserves existing data  
✅ **Comprehensive Fallbacks** - Handles errors gracefully without blocking submissions  
✅ **Manual Trigger** - API endpoint for manual extraction or re-extraction  
✅ **Status Tracking** - Tracks extraction lifecycle: `pending` → `processed` / `failed`

## Architecture

```
Intake Form Submission (with uploaded_pdf_id)
    ↓
1. Create Lead with context_status="pending"
    ↓
2. Map uploaded_pdf_id to file path (uploads/{id}.pdf)
    ↓
3. Extract text from PDF using pymupdf
    ↓
4. Extract structured business data using OpenAI
    ↓
5. Create lead_context_doc with extraction results
    ↓
6. Update lead fields (only empty fields)
    ↓
7. Update context_status to "processed" or "failed"
    ↓
8. Return response with extraction results
```

## Installation

1. **Install pymupdf dependency:**
```bash
cd server
.venv/bin/pip install pymupdf==1.24.0
```

2. **Verify installation:**
```bash
.venv/bin/python -c "import fitz; print('pymupdf installed successfully')"
```

## API Usage

### Automatic Extraction (Intake Form)

**Endpoint:** `POST /intake-forms`

**Request:**
```json
{
  "company_name": "ABC Corp",
  "email": "contact@abc.com",
  "pain_points": ["Lead tracking issues"],
  "contact_name": "John Doe",
  "urgency": "This month",
  "uploaded_pdf_id": "doc123"
}
```

**Response:**
```json
{
  "intake_form": { ... },
  "lead": {
    "id": "lead::uuid",
    "company": "ABC Corp",
    "context_status": "processed",
    "industry": "Logistics",
    "pain_point": "Lead tracking issues",
    ...
  },
  "extraction": {
    "status": "processed",
    "extracted_summary": "ABC Corp is a logistics company...",
    "extracted_fields": {
      "company": "ABC Corp",
      "industry": "Logistics",
      "pain_point": "Inefficient lead tracking",
      "timeline": "This month",
      "budget_readiness": "₱500k allocated",
      "decision_maker": "CEO"
    },
    "lead_updates": {
      "industry": "Logistics"
    },
    "context_doc_id": "context::uuid"
  }
}
```

### Manual Extraction

**Endpoint:** `POST /leads/{lead_id}/extract-pdf`

**Request:**
```json
{
  "file_path": "uploads/business-proposal.pdf"
}
```

**Response:**
```json
{
  "status": "processed",
  "extracted_summary": "Business document summary...",
  "extracted_fields": { ... },
  "lead_updates": { ... },
  "context_doc_id": "context::uuid"
}
```

## Extracted Fields

The AI extraction identifies and extracts:

| Field | Description | Example |
|-------|-------------|---------|
| `company` | Company name | "XYZ Manufacturing Inc." |
| `industry` | Industry or business sector | "Manufacturing", "Logistics" |
| `pain_point` | Main business problem | "Inefficient lead qualification" |
| `timeline` | Urgency or timeline | "This month", "Q2 2026" |
| `budget_readiness` | Budget information | "₱750k allocated", "Open to proposal" |
| `decision_maker` | Decision maker info | "Maria Santos, VP of Sales" |
| `buying_intent` | Buying intent level | "High", "Medium", "Low" |
| `target_clients` | Target market | "B2B electronics distributors" |
| `current_solution` | Current tools/solution | "Manual spreadsheet process" |

## Hybrid Field Update Strategy

The extraction uses a **hybrid merge strategy** that only updates empty lead fields:

```python
# Example: Lead has some existing data
lead = {
    "company": "Existing Company",  # Has value - NOT updated
    "industry": None,               # Empty - WILL be updated
    "pain_point": None,             # Empty - WILL be updated
    "budget_readiness": "Set value" # Has value - NOT updated
}

# After extraction with new data
extracted_fields = {
    "company": "New Company",       # Ignored (existing value preserved)
    "industry": "Logistics",        # Applied (was empty)
    "pain_point": "Lead tracking",  # Applied (was empty)
    "budget_readiness": "₱500k"     # Ignored (existing value preserved)
}
```

## Fallback Strategy

| Scenario | Behavior | context_status |
|----------|----------|----------------|
| File not found | Create context_doc with error, don't block submission | `failed` |
| PDF parsing error | Store error details, don't block submission | `failed` |
| Empty PDF | Note "no extractable text" | `processed` |
| OpenAI unavailable | Use keyword-based extraction | `processed` |
| AI extraction fails | Use raw text summary | `processed` |

## Testing

### Unit Tests

```bash
cd server
.venv/bin/python test_pdf_extraction.py
```

**Tests:**
- PDF text extraction with error handling
- AI-powered business data extraction
- Hybrid lead field merging strategy

### Integration Test

```bash
cd server
.venv/bin/python test_pdf_integration.py
```

**Tests:**
- Real PDF text extraction
- AI extraction with sample business document
- Field extraction verification (6/6 fields)

### Test Results

```
✓ Text extracted successfully (694 characters)
✓ Business data extracted successfully
✓ All 6 key fields extracted:
  - Company name
  - Industry
  - Pain point
  - Timeline/urgency
  - Budget information
  - Decision maker
  
📈 Extraction Score: 6/6 fields extracted
✅ EXCELLENT - Most key fields extracted
```

## File Structure

```
server/
├── app/
│   ├── services/
│   │   └── pdf_extractor.py          # PDF extraction service
│   └── routes/
│       ├── intake_forms.py            # Automatic extraction integration
│       └── leads.py                   # Manual extraction endpoint
├── uploads/                           # PDF storage directory
│   └── test-business-doc.pdf          # Sample test PDF
├── test_pdf_extraction.py             # Unit tests
├── test_pdf_integration.py            # Integration tests
└── requirements.txt                   # Dependencies (includes pymupdf)
```

## Configuration

### File Path Mapping

By default, `uploaded_pdf_id` maps to: `uploads/{uploaded_pdf_id}.pdf`

To customize, modify in `server/app/routes/intake_forms.py`:

```python
# Current mapping
pdf_file_path = f"uploads/{payload.uploaded_pdf_id}.pdf"

# Custom mapping example
pdf_file_path = f"/var/uploads/{payload.uploaded_pdf_id}.pdf"
```

### OpenAI Configuration

Extraction uses the existing OpenAI configuration from `.env`:

```bash
OPENAI_API_KEY=your_openai_key
```

If OpenAI is unavailable, the system automatically falls back to keyword-based extraction.

## Error Handling

All extraction errors are handled gracefully:

1. **Errors don't block intake form submission** - Lead is created even if extraction fails
2. **Errors are logged in context_doc** - Check `data.error` field for details
3. **context_status reflects outcome** - `processed` or `failed`
4. **Manual retry available** - Use `/leads/{lead_id}/extract-pdf` to retry

## Next Steps

### 1. File Upload Endpoint (Not Yet Implemented)

Create an endpoint to handle PDF uploads:

```python
@router.post("/upload")
async def upload_pdf(file: UploadFile):
    # Save file to uploads directory
    # Return uploaded_pdf_id
    pass
```

### 2. Frontend Integration

Build file upload UI component in intake form:

```tsx
<input 
  type="file" 
  accept=".pdf"
  onChange={handlePdfUpload}
/>
```

### 3. Storage Configuration

Configure persistent storage:
- **Local:** Use `uploads/` directory (current)
- **Cloud:** Integrate S3, GCS, or Azure Blob Storage

### 4. Monitoring

Add logging and monitoring:
- Track extraction success/failure rates
- Monitor OpenAI API usage
- Alert on high failure rates

### 5. Retry Mechanism

Implement automatic retry for failed extractions:
- Background job to retry failed extractions
- Exponential backoff strategy
- Maximum retry attempts

## Troubleshooting

### Issue: "Module 'fitz' not found"

**Solution:** Install pymupdf
```bash
cd server
.venv/bin/pip install pymupdf==1.24.0
```

### Issue: "File not found" error

**Solution:** Ensure uploads directory exists
```bash
mkdir -p server/uploads
```

### Issue: Extraction returns empty fields

**Possible causes:**
1. PDF contains no text (scanned image)
2. OpenAI API key not configured
3. PDF text is not in expected format

**Solution:** Check extraction logs in context_doc

### Issue: Lead fields not updating

**Cause:** Hybrid strategy - fields already have values

**Solution:** This is expected behavior. Only empty fields are updated.

## Support

For issues or questions:
1. Check test results: `test_pdf_extraction.py` and `test_pdf_integration.py`
2. Review context_doc for extraction details
3. Check OpenAI API key configuration
4. Verify PDF file exists and is readable

## License

Part of the Workflow PH project.
