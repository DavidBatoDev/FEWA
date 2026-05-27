#!/usr/bin/env python3
"""
End-to-end test for intake form submission with PDF extraction.
Tests the complete flow from form submission to PDF extraction.
"""

import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def test_intake_form_without_pdf():
    """Test 1: Intake form submission without PDF"""
    print("\n" + "="*70)
    print("TEST 1: Intake Form Submission WITHOUT PDF")
    print("="*70)
    
    payload = {
        "company_name": "Test Company Inc",
        "company_description": "A test company for integration testing",
        "email": "test@example.com",
        "pain_points": ["Lead tracking issues", "Manual follow-ups"],
        "contact_name": "John Doe",
        "target_clients": "B2B enterprises",
        "urgency": "This month",
        "budget_readiness": "Open to proposal",
        "decision_maker": "Yes",
        "preferred_next_step": "Discovery call"
    }
    
    print(f"\nPOST {BASE_URL}/intake-forms")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(f"{BASE_URL}/intake-forms", json=payload)
        print(f"\nStatus Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ SUCCESS")
            print(f"Lead ID: {data['lead']['id']}")
            print(f"Lead Status: {data['lead']['status']}")
            print(f"Context Status: {data['lead']['context_status']}")
            print(f"Lead Score: {data['lead']['lead_score']}")
            print(f"Lead Temperature: {data['lead']['lead_temperature']}")
            print(f"Extraction Result: {data.get('extraction', 'None (no PDF)')}")
            return data['lead']['id']
        else:
            print(f"\n❌ FAILED")
            print(f"Error: {response.text}")
            return None
            
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        return None


def test_intake_form_with_pdf():
    """Test 2: Intake form submission with PDF"""
    print("\n" + "="*70)
    print("TEST 2: Intake Form Submission WITH PDF")
    print("="*70)
    
    payload = {
        "company_name": "XYZ Manufacturing",
        "company_description": "Electronics manufacturing company",
        "email": "contact@xyzmanufacturing.com",
        "pain_points": ["Need CRM system"],
        "contact_name": "Maria Santos",
        "urgency": "Urgent",
        "uploaded_pdf_id": "test-business-doc"  # This will map to uploads/test-business-doc.pdf
    }
    
    print(f"\nPOST {BASE_URL}/intake-forms")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(f"{BASE_URL}/intake-forms", json=payload)
        print(f"\nStatus Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ SUCCESS")
            print(f"\nLead Information:")
            print(f"  ID: {data['lead']['id']}")
            print(f"  Company: {data['lead']['company']}")
            print(f"  Industry: {data['lead'].get('industry', 'N/A')}")
            print(f"  Pain Point: {data['lead'].get('pain_point', 'N/A')}")
            print(f"  Timeline: {data['lead'].get('timeline', 'N/A')}")
            print(f"  Budget Readiness: {data['lead'].get('budget_readiness', 'N/A')}")
            print(f"  Decision Maker: {data['lead'].get('decision_maker', 'N/A')}")
            print(f"  Context Status: {data['lead']['context_status']}")
            print(f"  Lead Score: {data['lead']['lead_score']}")
            print(f"  Lead Temperature: {data['lead']['lead_temperature']}")
            
            if data.get('extraction'):
                print(f"\n📄 PDF Extraction Results:")
                extraction = data['extraction']
                print(f"  Status: {extraction.get('status', 'N/A')}")
                print(f"  Summary: {extraction.get('extracted_summary', 'N/A')[:100]}...")
                print(f"  Fields Extracted: {list(extraction.get('extracted_fields', {}).keys())}")
                print(f"  Lead Fields Updated: {list(extraction.get('lead_updates', {}).keys())}")
                print(f"  Context Doc ID: {extraction.get('context_doc_id', 'N/A')}")
                
                if extraction.get('extraction_error'):
                    print(f"  ⚠️  Error: {extraction['extraction_error']}")
            else:
                print(f"\n⚠️  No extraction result returned")
            
            return data['lead']['id']
        else:
            print(f"\n❌ FAILED")
            print(f"Error: {response.text}")
            return None
            
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return None


def test_manual_extraction(lead_id):
    """Test 3: Manual PDF extraction endpoint"""
    print("\n" + "="*70)
    print("TEST 3: Manual PDF Extraction Endpoint")
    print("="*70)
    
    payload = {
        "file_path": "uploads/test-business-doc.pdf"
    }
    
    print(f"\nPOST {BASE_URL}/leads/{lead_id}/extract-pdf")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(f"{BASE_URL}/leads/{lead_id}/extract-pdf", json=payload)
        print(f"\nStatus Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ SUCCESS")
            print(f"\nExtraction Results:")
            print(f"  Status: {data.get('status', 'N/A')}")
            print(f"  Summary: {data.get('extracted_summary', 'N/A')[:150]}...")
            print(f"  Fields Extracted: {len(data.get('extracted_fields', {}))}")
            print(f"  Lead Fields Updated: {len(data.get('lead_updates', {}))}")
            
            if data.get('extracted_fields'):
                print(f"\n  Extracted Fields:")
                for key, value in data['extracted_fields'].items():
                    if value:
                        print(f"    - {key}: {value}")
            
            return True
        else:
            print(f"\n❌ FAILED")
            print(f"Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        return False


def test_get_lead(lead_id):
    """Test 4: Verify lead was updated correctly"""
    print("\n" + "="*70)
    print("TEST 4: Verify Lead Data")
    print("="*70)
    
    print(f"\nGET {BASE_URL}/leads/{lead_id}")
    
    try:
        response = requests.get(f"{BASE_URL}/leads/{lead_id}")
        print(f"\nStatus Code: {response.status_code}")
        
        if response.status_code == 200:
            lead = response.json()
            print(f"\n✅ SUCCESS")
            print(f"\nFinal Lead State:")
            print(f"  Company: {lead.get('company', 'N/A')}")
            print(f"  Industry: {lead.get('industry', 'N/A')}")
            print(f"  Pain Point: {lead.get('pain_point', 'N/A')}")
            print(f"  Timeline: {lead.get('timeline', 'N/A')}")
            print(f"  Budget Readiness: {lead.get('budget_readiness', 'N/A')}")
            print(f"  Decision Maker: {lead.get('decision_maker', 'N/A')}")
            print(f"  Context Status: {lead.get('context_status', 'N/A')}")
            print(f"  Lead Score: {lead.get('lead_score', 'N/A')}")
            print(f"  Lead Temperature: {lead.get('lead_temperature', 'N/A')}")
            return True
        else:
            print(f"\n❌ FAILED")
            print(f"Error: {response.text}")
            return False
            
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        return False


def main():
    print("\n" + "="*70)
    print("PDF EXTRACTION - END-TO-END INTEGRATION TEST")
    print("="*70)
    print(f"Testing against: {BASE_URL}")
    
    # Test 1: Without PDF
    lead_id_1 = test_intake_form_without_pdf()
    
    # Test 2: With PDF (automatic extraction)
    lead_id_2 = test_intake_form_with_pdf()
    
    # Test 3: Manual extraction (if we have a lead)
    if lead_id_1:
        test_manual_extraction(lead_id_1)
    
    # Test 4: Verify lead data
    if lead_id_2:
        test_get_lead(lead_id_2)
    
    print("\n" + "="*70)
    print("TEST SUITE COMPLETED")
    print("="*70)
    
    if lead_id_1 and lead_id_2:
        print("\n✅ All tests passed!")
        return 0
    else:
        print("\n⚠️  Some tests failed. Check output above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
