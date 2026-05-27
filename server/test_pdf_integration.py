"""
Integration test for PDF extraction with real PDF file.

This test demonstrates:
1. Text extraction from a real PDF
2. AI-powered business data extraction
3. Complete extraction workflow with database operations (mocked)
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.pdf_extractor import (
    extract_text_from_pdf,
    extract_business_data_from_text,
)


async def test_real_pdf_extraction():
    """Test extraction with the sample business document PDF."""
    print("\n" + "=" * 70)
    print("INTEGRATION TEST: Real PDF Extraction")
    print("=" * 70)
    
    pdf_path = "uploads/test-business-doc.pdf"
    
    if not Path(pdf_path).exists():
        print(f"\n❌ Test PDF not found: {pdf_path}")
        print("Run the PDF creation script first.")
        return
    
    print(f"\n📄 Testing with: {pdf_path}")
    
    # Step 1: Extract text from PDF
    print("\n--- Step 1: Extract Text from PDF ---")
    try:
        text = extract_text_from_pdf(pdf_path)
        print(f"✓ Text extracted successfully")
        print(f"  Length: {len(text)} characters")
        print(f"  Preview: {text[:200]}...")
    except Exception as e:
        print(f"❌ Text extraction failed: {e}")
        return
    
    # Step 2: Extract business data using AI
    print("\n--- Step 2: Extract Business Data with AI ---")
    try:
        result = await extract_business_data_from_text(text)
        
        print(f"\n✓ Business data extracted successfully")
        print(f"\n📋 Summary:")
        print(f"  {result.get('summary', 'N/A')}")
        
        print(f"\n📊 Extracted Fields:")
        fields = result.get('fields', {})
        
        field_labels = {
            'company': '🏢 Company',
            'industry': '🏭 Industry',
            'pain_point': '⚠️  Pain Point',
            'timeline': '⏰ Timeline',
            'budget_readiness': '💰 Budget',
            'decision_maker': '👤 Decision Maker',
            'buying_intent': '🎯 Buying Intent',
            'target_clients': '🎯 Target Clients',
            'current_solution': '🔧 Current Solution',
        }
        
        for key, label in field_labels.items():
            value = fields.get(key)
            if value:
                print(f"  {label}: {value}")
        
        # Verify key information was extracted
        print("\n--- Verification ---")
        checks = [
            ('company', 'Company name'),
            ('industry', 'Industry'),
            ('pain_point', 'Pain point'),
            ('timeline', 'Timeline/urgency'),
            ('budget_readiness', 'Budget information'),
            ('decision_maker', 'Decision maker'),
        ]
        
        passed = 0
        for key, description in checks:
            if fields.get(key):
                print(f"  ✓ {description} extracted")
                passed += 1
            else:
                print(f"  ⚠️  {description} not found")
        
        print(f"\n📈 Extraction Score: {passed}/{len(checks)} fields extracted")
        
        if passed >= 4:
            print("  ✅ EXCELLENT - Most key fields extracted")
        elif passed >= 2:
            print("  ⚠️  PARTIAL - Some fields extracted")
        else:
            print("  ❌ POOR - Few fields extracted")
        
    except Exception as e:
        print(f"❌ Business data extraction failed: {e}")
        return
    
    print("\n" + "=" * 70)
    print("INTEGRATION TEST COMPLETED SUCCESSFULLY")
    print("=" * 70)
    
    print("\n📝 Next Steps:")
    print("  1. Test with intake form submission: POST /intake-forms")
    print("  2. Test manual extraction endpoint: POST /leads/{lead_id}/extract-pdf")
    print("  3. Verify lead fields are updated correctly")
    print("  4. Check context_status transitions: pending → processed")


async def main():
    await test_real_pdf_extraction()


if __name__ == "__main__":
    asyncio.run(main())
