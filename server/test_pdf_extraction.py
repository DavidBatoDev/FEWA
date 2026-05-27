"""
Test script for PDF extraction functionality.

This script tests:
1. PDF text extraction with pymupdf
2. AI-powered business data extraction
3. Lead field merging with hybrid strategy
4. End-to-end extraction orchestration
"""

import asyncio
import sys
from pathlib import Path

# Add server directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.pdf_extractor import (
    extract_text_from_pdf,
    extract_business_data_from_text,
    merge_lead_fields,
)
from app.models.lead import Lead


def test_text_extraction():
    """Test basic text extraction from PDF."""
    print("\n=== Test 1: PDF Text Extraction ===")
    
    # Test with non-existent file
    try:
        extract_text_from_pdf("nonexistent.pdf")
        print("❌ Should have raised FileNotFoundError")
    except FileNotFoundError as e:
        print(f"✓ Correctly raised FileNotFoundError: {e}")
    
    print("\nNote: To test with real PDF, place a PDF file in uploads/ directory")


async def test_ai_extraction():
    """Test AI-powered business data extraction."""
    print("\n=== Test 2: AI Business Data Extraction ===")
    
    sample_text = """
    ABC Logistics Company
    Business Proposal Request
    
    We are a logistics company based in Manila serving e-commerce businesses.
    We're experiencing significant challenges with lead tracking and follow-up.
    
    Current situation:
    - Losing 40% of inquiries due to poor tracking
    - Manual spreadsheet-based process
    - Need solution urgently (this month)
    - Budget allocated: ₱500,000
    
    Decision maker: John Santos, CEO
    Contact: john@abclogistics.ph
    
    We need an automated CRM system to improve our sales process.
    """
    
    result = await extract_business_data_from_text(sample_text)
    
    print(f"Summary: {result.get('summary', 'N/A')}")
    print(f"\nExtracted Fields:")
    for key, value in result.get('fields', {}).items():
        if value:
            print(f"  - {key}: {value}")
    
    # Verify key fields were extracted
    fields = result.get('fields', {})
    if fields.get('company'):
        print("\n✓ Company name extracted")
    if fields.get('industry'):
        print("✓ Industry extracted")
    if fields.get('pain_point'):
        print("✓ Pain point extracted")
    if fields.get('timeline'):
        print("✓ Timeline extracted")
    if fields.get('budget_readiness'):
        print("✓ Budget information extracted")


def test_field_merging():
    """Test hybrid lead field merging strategy."""
    print("\n=== Test 3: Lead Field Merging (Hybrid Strategy) ===")
    
    # Create a lead with some existing data
    lead = Lead(
        company="Existing Company",
        email="test@example.com",
        pain_point=None,  # Empty - should be updated
        timeline=None,  # Empty - should be updated
        budget_readiness="Already set",  # Has value - should NOT be updated
        decision_maker=None,  # Empty - should be updated
        industry=None,  # Empty - should be updated
    )
    
    extracted_fields = {
        "company": "New Company Name",  # Should NOT update (existing value)
        "industry": "Logistics",  # Should update (was None)
        "pain_point": "Lead tracking issues",  # Should update (was None)
        "timeline": "This month",  # Should update (was None)
        "budget_readiness": "₱500k allocated",  # Should NOT update (existing value)
        "decision_maker": "CEO",  # Should update (was None)
    }
    
    updates = merge_lead_fields(lead, extracted_fields)
    
    print(f"Fields to update: {list(updates.keys())}")
    print(f"\nUpdate details:")
    for key, value in updates.items():
        print(f"  - {key}: {value}")
    
    # Verify hybrid strategy
    assert "company" not in updates, "Should NOT update existing company"
    assert "budget_readiness" not in updates, "Should NOT update existing budget_readiness"
    assert "industry" in updates, "Should update empty industry"
    assert "pain_point" in updates, "Should update empty pain_point"
    assert "timeline" in updates, "Should update empty timeline"
    assert "decision_maker" in updates, "Should update empty decision_maker"
    
    print("\n✓ Hybrid merge strategy working correctly")


async def main():
    """Run all tests."""
    print("=" * 60)
    print("PDF EXTRACTION IMPLEMENTATION TEST SUITE")
    print("=" * 60)
    
    test_text_extraction()
    await test_ai_extraction()
    test_field_merging()
    
    print("\n" + "=" * 60)
    print("TEST SUITE COMPLETED")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Install pymupdf: pip install pymupdf")
    print("2. Place a test PDF in uploads/ directory")
    print("3. Test with real PDF file")
    print("4. Test intake form submission with uploaded_pdf_id")
    print("5. Test manual extraction endpoint: POST /leads/{lead_id}/extract-pdf")


if __name__ == "__main__":
    asyncio.run(main())
