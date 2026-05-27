# Git Pull Summary - Couchbase Multi-Scope Enhancement

## Date: 2026-05-27

## Changes Pulled from Remote

### Commit: `b0f2c2e` - feat(couchbase): enhance setup and seeding scripts for B2B/B2C scopes and collections

**Author:** JCarloZ24  
**Date:** Wed May 27 13:40:55 2026 +0800

### Overview
The remote branch introduced a **multi-scope architecture** for Couchbase, allowing the platform to support both B2B (Sales Agent) and B2C (Commerce Agent) workflows in separate scopes within the same bucket.

---

## Key Changes

### 1. Multi-Scope Configuration

**New Environment Variables** (`.env.example` and `config.py`):
```bash
COUCHBASE_SCOPE=sales_agent           # Default scope (legacy)
COUCHBASE_SCOPE_B2B=b2b               # B2B Sales Agent scope
COUCHBASE_SCOPE_B2C=b2c               # B2C Commerce Agent scope
COUCHBASE_PROVISION_SCOPES=sales_agent,b2b,b2c  # Scopes to provision
```

### 2. Context-Based Scope Resolution

**Updated:** `server/app/db/couchbase.py`

New functions:
- `_resolve_scope_for_flow(flow: str | None) -> str` - Maps flow type to scope name
- `set_request_scope_from_flow(flow: str | None) -> Token` - Sets scope for current request
- `reset_request_scope(token: Token) -> None` - Resets scope after request
- `get_active_scope_name() -> str` - Gets current active scope

**Usage Pattern:**
```python
# Set scope for B2B flow
token = set_request_scope_from_flow("b2b")
try:
    # All database operations use B2B scope
    leads_col = get_collection("leads")
    # ...
finally:
    reset_request_scope(token)
```

### 3. Enhanced Setup Script

**Updated:** `couchbase/setup_collections.py`

- Now provisions multiple scopes based on `COUCHBASE_PROVISION_SCOPES` env var
- Creates collections in each scope: `campaigns`, `leads`, `conversations`, `offers`, `follow_ups`, `intake_forms`, `lead_context_docs`, `discovery_calls`
- Creates indexes for each scope independently
- Supports dynamic scope configuration

### 4. Enhanced Seeding Script

**Updated:** `couchbase/seed_offers.py`

- Seeds offers into multiple scopes
- Supports B2B and B2C specific offers

---

## Impact on PDF Extraction Implementation

### ✅ No Breaking Changes

Our PDF extraction implementation is **fully compatible** with the multi-scope architecture because:

1. **Uses existing database helpers** - We use `get_collection()` and `get_scope()` which now respect the active scope context
2. **Scope-agnostic design** - Our extraction service doesn't hardcode scope names
3. **Works with any scope** - The extraction logic works identically across B2B, B2C, or legacy scopes

### How PDF Extraction Works with Multi-Scope

**Scenario 1: B2B Intake Form with PDF**
```python
# Frontend sets flow context
token = set_request_scope_from_flow("b2b")
try:
    # Intake form submission
    POST /intake-forms
    {
        "uploaded_pdf_id": "doc123",
        ...
    }
    
    # PDF extraction automatically uses B2B scope
    # - Reads lead from b2b.leads
    # - Creates context_doc in b2b.lead_context_docs
    # - Updates lead in b2b.leads
finally:
    reset_request_scope(token)
```

**Scenario 2: B2C Intake Form with PDF**
```python
# Frontend sets flow context
token = set_request_scope_from_flow("b2c")
try:
    # Same extraction logic, different scope
    # - Uses b2c.leads
    # - Uses b2c.lead_context_docs
finally:
    reset_request_scope(token)
```

### Collections Used by PDF Extraction

Our implementation uses these collections (now available in each scope):
- ✅ `leads` - Read and update lead records
- ✅ `lead_context_docs` - Store extraction results
- ✅ `intake_forms` - (indirectly, via intake form route)

All these collections are provisioned in each scope by the updated setup script.

---

## Migration Notes

### For Existing Data

If you have existing data in the `sales_agent` scope:
1. Data remains accessible via default scope
2. New B2B/B2C flows use their respective scopes
3. No data migration required

### For New Deployments

1. **Set environment variables:**
   ```bash
   COUCHBASE_SCOPE=sales_agent
   COUCHBASE_SCOPE_B2B=b2b
   COUCHBASE_SCOPE_B2C=b2c
   COUCHBASE_PROVISION_SCOPES=sales_agent,b2b,b2c
   ```

2. **Run setup script:**
   ```bash
   cd couchbase
   python setup_collections.py
   ```

3. **Verify collections:**
   - Check Couchbase UI for `b2b` and `b2c` scopes
   - Verify all 8 collections exist in each scope
   - Verify indexes are created

---

## Testing with Multi-Scope

### Test PDF Extraction in B2B Scope

```python
from app.db.couchbase import set_request_scope_from_flow, reset_request_scope

token = set_request_scope_from_flow("b2b")
try:
    # Test intake form with PDF
    # All operations use b2b scope
    result = await process_pdf_extraction("uploads/test.pdf", lead_id)
finally:
    reset_request_scope(token)
```

### Test PDF Extraction in B2C Scope

```python
token = set_request_scope_from_flow("b2c")
try:
    # Same test, different scope
    result = await process_pdf_extraction("uploads/test.pdf", lead_id)
finally:
    reset_request_scope(token)
```

---

## Recommendations

### 1. Update Integration Tests

Add scope context to integration tests:

```python
# test_pdf_integration.py
async def test_with_b2b_scope():
    token = set_request_scope_from_flow("b2b")
    try:
        # Test extraction in B2B scope
        pass
    finally:
        reset_request_scope(token)
```

### 2. Document Scope Usage

Add to API documentation:
- How to specify flow type in requests
- Which scope is used for each endpoint
- How to query data across scopes

### 3. Monitoring

Track extraction metrics per scope:
- B2B extraction success rate
- B2C extraction success rate
- Scope-specific error patterns

---

## Summary

✅ **PDF extraction implementation is fully compatible with multi-scope architecture**  
✅ **No code changes required in pdf_extractor.py**  
✅ **Works seamlessly across B2B, B2C, and legacy scopes**  
✅ **All required collections are provisioned in each scope**  
✅ **Successfully rebased and pushed to remote**

The multi-scope enhancement provides better separation between B2B and B2C workflows while maintaining backward compatibility with existing code.
