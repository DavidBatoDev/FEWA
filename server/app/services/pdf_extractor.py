import json
import uuid
from pathlib import Path
from typing import Optional

from openai import AsyncOpenAI

from app.config import settings
from app.db.couchbase import get_collection
from app.models.lead import Lead


def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from an uploaded file. PDF parsing is disabled; returns empty for binary files."""
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    if not path.is_file():
        raise ValueError(f"Path is not a file: {file_path}")

    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception as e:
        raise RuntimeError(f"Failed to read file: {str(e)}")


def _has_openai_key() -> bool:
    return bool(settings.openai_api_key and settings.openai_api_key.strip())


def _fallback_extraction(text: str) -> dict:
    """Basic keyword-based extraction when OpenAI is unavailable."""
    text_lower = text.lower()
    
    fields = {}
    summary_parts = []
    
    # Extract company name (look for common patterns)
    for line in text.split("\n")[:10]:
        if len(line.strip()) > 3 and len(line.strip()) < 100:
            if not any(kw in line.lower() for kw in ["page", "date", "subject", "re:"]):
                fields["company"] = line.strip()
                summary_parts.append(f"Company: {line.strip()}")
                break
    
    # Detect industry keywords
    industries = {
        "logistics": ["logistics", "shipping", "delivery", "transport"],
        "retail": ["retail", "store", "shop", "sales"],
        "manufacturing": ["manufacturing", "factory", "production"],
        "technology": ["software", "technology", "IT", "tech", "digital"],
        "healthcare": ["healthcare", "medical", "hospital", "clinic"],
    }
    
    for industry, keywords in industries.items():
        if any(kw in text_lower for kw in keywords):
            fields["industry"] = industry.capitalize()
            summary_parts.append(f"Industry: {industry.capitalize()}")
            break
    
    # Detect budget mentions
    if any(kw in text_lower for kw in ["budget", "₱", "php", "pesos", "investment"]):
        fields["budget_readiness"] = "Budget mentioned in document"
        summary_parts.append("Budget information found")
    
    # Detect urgency
    if any(kw in text_lower for kw in ["urgent", "asap", "immediately", "this month", "this week"]):
        fields["timeline"] = "Urgent"
        summary_parts.append("Urgent timeline indicated")
    
    summary = "Business document uploaded. " + ". ".join(summary_parts) if summary_parts else "Business document uploaded with limited extractable information."
    
    return {
        "summary": summary,
        "fields": fields
    }


async def extract_business_data_from_text(text: str) -> dict:
    """Extract structured business data from text using OpenAI."""
    if not text or not text.strip():
        return {
            "summary": "Empty document - no text extracted.",
            "fields": {}
        }
    
    if not _has_openai_key():
        return _fallback_extraction(text)
    
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    
    prompt = f"""Extract structured business information from this document text.

Document Text:
{text[:4000]}

Return a JSON object with:
1. "summary": A 2-3 sentence summary of the business context, needs, or requirements
2. "fields": An object with any of these fields you can extract (use null if not found):
   - "company": Company name
   - "industry": Industry or business sector
   - "pain_point": Main business problem or challenge mentioned
   - "timeline": Urgency or timeline mentioned (e.g., "This month", "Q2 2026", "Urgent")
   - "budget_readiness": Budget information or readiness (e.g., "₱500k allocated", "Open to proposal")
   - "decision_maker": Decision maker information or role
   - "buying_intent": Level of buying intent (High/Medium/Low)
   - "target_clients": Target clients or market mentioned
   - "current_solution": Current solution or tools they're using

Return only valid JSON, no explanation."""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            response_format={"type": "json_object"},
        )
        
        result = json.loads(response.choices[0].message.content or "{}")
        
        # Ensure required structure
        if "summary" not in result:
            result["summary"] = "Business document processed."
        if "fields" not in result:
            result["fields"] = {}
        
        return result
    
    except Exception:
        return _fallback_extraction(text)


def merge_lead_fields(current_lead: Lead, extracted_fields: dict) -> dict:
    """Merge extracted fields into lead, only updating empty/null fields."""
    updates = {}
    
    field_mapping = {
        "company": "company",
        "industry": "industry",
        "pain_point": "pain_point",
        "timeline": "timeline",
        "budget_readiness": "budget_readiness",
        "decision_maker": "decision_maker",
        "buying_intent": "buying_intent",
        "current_solution": "current_solution",
    }
    
    for extracted_key, lead_key in field_mapping.items():
        if extracted_key in extracted_fields and extracted_fields[extracted_key]:
            current_value = getattr(current_lead, lead_key, None)
            
            # Only update if current value is empty
            if current_value is None or current_value == "" or current_value == []:
                updates[lead_key] = extracted_fields[extracted_key]
    
    return updates


def _now_iso() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


async def process_pdf_extraction(file_path: str, lead_id: str) -> dict:
    """
    Orchestrate PDF extraction: text extraction → AI extraction → context_doc creation → lead update.
    Returns extraction result with status and data.
    """
    leads_col = get_collection("leads")
    context_col = get_collection("lead_context_docs")
    
    result = {
        "status": "pending",
        "extraction_error": None,
        "extracted_summary": "",
        "extracted_fields": {},
        "lead_updates": {},
        "context_doc_id": None
    }
    
    # Get current lead
    try:
        lead_result = leads_col.get(lead_id)
        lead = Lead(**lead_result.content_as[dict])
    except Exception as e:
        result["status"] = "failed"
        result["extraction_error"] = f"Lead not found: {str(e)}"
        return result
    
    # Step 1: Extract text from PDF
    try:
        text = extract_text_from_pdf(file_path)
        
        if not text or not text.strip():
            result["status"] = "processed"
            result["extracted_summary"] = "PDF contains no extractable text."
            result["extraction_error"] = "Empty PDF"
    
    except FileNotFoundError as e:
        result["status"] = "failed"
        result["extraction_error"] = str(e)
        
        # Create failed context doc
        context_id = f"context::{uuid.uuid4()}"
        ts = _now_iso()
        doc = {
            "type": "lead_context_doc",
            "lead_id": lead_id,
            "source_type": "pdf",
            "source_name": Path(file_path).name,
            "source_url": file_path,
            "extraction_status": "failed",
            "extracted_summary": result["extraction_error"],
            "data": {"raw_payload": {}, "extracted_fields": {}, "error": result["extraction_error"]},
            "created_at": ts,
            "updated_at": ts,
        }
        context_col.insert(context_id, doc)
        result["context_doc_id"] = context_id
        
        # Update lead context_status
        lead.context_status = "failed"
        lead.updated_at = ts
        leads_col.replace(lead_id, lead.model_dump())
        
        return result
    
    except Exception as e:
        result["status"] = "failed"
        result["extraction_error"] = f"PDF parsing error: {str(e)}"
        
        # Create failed context doc
        context_id = f"context::{uuid.uuid4()}"
        ts = _now_iso()
        doc = {
            "type": "lead_context_doc",
            "lead_id": lead_id,
            "source_type": "pdf",
            "source_name": Path(file_path).name,
            "source_url": file_path,
            "extraction_status": "failed",
            "extracted_summary": result["extraction_error"],
            "data": {"raw_payload": {}, "extracted_fields": {}, "error": result["extraction_error"]},
            "created_at": ts,
            "updated_at": ts,
        }
        context_col.insert(context_id, doc)
        result["context_doc_id"] = context_id
        
        # Update lead context_status
        lead.context_status = "failed"
        lead.updated_at = ts
        leads_col.replace(lead_id, lead.model_dump())
        
        return result
    
    # Step 2: Extract business data using AI
    try:
        extraction_data = await extract_business_data_from_text(text)
        result["extracted_summary"] = extraction_data.get("summary", "")
        result["extracted_fields"] = extraction_data.get("fields", {})
        result["status"] = "processed"
    
    except Exception as e:
        # Partial success - we have text but AI extraction failed
        result["status"] = "processed"
        result["extracted_summary"] = f"PDF text extracted ({len(text)} characters). AI extraction unavailable."
        result["extraction_error"] = f"AI extraction failed: {str(e)}"
    
    # Step 3: Create context document
    context_id = f"context::{uuid.uuid4()}"
    ts = _now_iso()
    doc = {
        "type": "lead_context_doc",
        "lead_id": lead_id,
        "source_type": "pdf",
        "source_name": Path(file_path).name,
        "source_url": file_path,
        "extraction_status": result["status"],
        "extracted_summary": result["extracted_summary"],
        "data": {
            "raw_payload": {"text_length": len(text), "text_preview": text[:500]},
            "extracted_fields": result["extracted_fields"],
            "error": result["extraction_error"]
        },
        "created_at": ts,
        "updated_at": ts,
    }
    context_col.insert(context_id, doc)
    result["context_doc_id"] = context_id
    
    # Step 4: Update lead fields (hybrid strategy)
    lead_updates = merge_lead_fields(lead, result["extracted_fields"])
    
    if lead_updates:
        for key, value in lead_updates.items():
            setattr(lead, key, value)
        result["lead_updates"] = lead_updates
    
    # Update lead context_status and timestamp
    lead.context_status = result["status"]
    lead.updated_at = ts
    leads_col.replace(lead_id, lead.model_dump())
    
    return result
