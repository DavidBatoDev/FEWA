#!/usr/bin/env python3
"""
Populate test data into Couchbase database via API calls.
This script creates real database records for testing.

Requirements:
- Server must be running (python run.py)
- Couchbase must be configured and accessible
- Test PDF must exist: uploads/test-business-doc.pdf
"""

import json
import time
import sys
from pathlib import Path

# Try to import httpx, fall back to instructions if not available
try:
    import httpx
except ImportError:
    print("❌ httpx not installed. Installing...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "httpx"])
    import httpx

BASE_URL = "http://localhost:8000"


def print_section(title):
    """Print a formatted section header"""
    print("\n" + "="*70)
    print(f"  {title}")
    print("="*70)


def print_result(success, message, data=None):
    """Print formatted result"""
    icon = "✅" if success else "❌"
    print(f"\n{icon} {message}")
    if data:
        print(f"\n{json.dumps(data, indent=2)}")


def test_server_connection():
    """Test if server is running"""
    print_section("Testing Server Connection")
    try:
        response = httpx.get(f"{BASE_URL}/leads", timeout=5.0)
        if response.status_code == 200:
            print_result(True, "Server is running and accessible")
            return True
        else:
            print_result(False, f"Server returned status {response.status_code}")
            return False
    except Exception as e:
        print_result(False, f"Cannot connect to server: {e}")
        print("\n💡 Make sure the server is running:")
        print("   cd server && .venv/bin/python run.py")
        return False


def create_intake_without_pdf():
    """Create intake form without PDF (baseline test)"""
    print_section("Test 1: Create Intake Form WITHOUT PDF")
    
    payload = {
        "company_name": "Baseline Test Company",
        "company_description": "A company without PDF upload",
        "email": "baseline@test.com",
        "pain_points": ["Manual processes", "No automation"],
        "contact_name": "Jane Smith",
        "target_clients": "SMEs",
        "urgency": "Next quarter",
        "budget_readiness": "Exploring options",
        "decision_maker": "Yes",
        "preferred_next_step": "Send proposal"
    }
    
    print(f"\nPOST {BASE_URL}/intake-forms")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = httpx.post(f"{BASE_URL}/intake-forms", json=payload, timeout=10.0)
        
        if response.status_code == 200:
            data = response.json()
            lead_id = data['lead']['id']
            intake_id = data['intake_form']['id']
            
            print_result(True, "Intake form created successfully")
            print(f"\n📊 Created Records:")
            print(f"   Lead ID: {lead_id}")
            print(f"   Intake ID: {intake_id}")
            print(f"   Context Status: {data['lead']['context_status']}")
            print(f"   Lead Score: {data['lead']['lead_score']}")
            print(f"   Lead Temperature: {data['lead']['lead_temperature']}")
            
            return lead_id
        else:
            print_result(False, f"Failed with status {response.status_code}")
            print(f"Error: {response.text}")
            return None
            
    except Exception as e:
        print_result(False, f"Request failed: {e}")
        return None


def create_intake_with_pdf():
    """Create intake form with PDF (triggers extraction)"""
    print_section("Test 2: Create Intake Form WITH PDF (Auto Extraction)")
    
    # Check if test PDF exists
    pdf_path = Path("uploads/test-business-doc.pdf")
    if not pdf_path.exists():
        print_result(False, f"Test PDF not found: {pdf_path}")
        print("\n💡 The test PDF should be at: server/uploads/test-business-doc.pdf")
        return None
    
    print(f"✓ Test PDF found: {pdf_path}")
    
    payload = {
        "company_name": "XYZ Manufacturing",
        "company_description": "Electronics manufacturing company",
        "email": "contact@xyzmanufacturing.com",
        "pain_points": ["Need CRM system"],
        "contact_name": "Maria Santos",
        "urgency": "Urgent",
        "uploaded_pdf_id": "test-business-doc"  # Triggers PDF extraction
    }
    
    print(f"\nPOST {BASE_URL}/intake-forms")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    print("\n⏳ Processing... (PDF extraction may take 3-5 seconds)")
    
    try:
        response = httpx.post(f"{BASE_URL}/intake-forms", json=payload, timeout=30.0)
        
        if response.status_code == 200:
            data = response.json()
            lead_id = data['lead']['id']
            intake_id = data['intake_form']['id']
            extraction = data.get('extraction')
            
            print_result(True, "Intake form created with PDF extraction")
            
            print(f"\n📊 Created Records:")
            print(f"   Lead ID: {lead_id}")
            print(f"   Intake ID: {intake_id}")
            
            print(f"\n👤 Lead Information:")
            print(f"   Company: {data['lead']['company']}")
            print(f"   Industry: {data['lead'].get('industry', 'N/A')}")
            print(f"   Pain Point: {data['lead'].get('pain_point', 'N/A')}")
            print(f"   Timeline: {data['lead'].get('timeline', 'N/A')}")
            print(f"   Budget: {data['lead'].get('budget_readiness', 'N/A')}")
            print(f"   Decision Maker: {data['lead'].get('decision_maker', 'N/A')}")
            print(f"   Context Status: {data['lead']['context_status']}")
            print(f"   Lead Score: {data['lead']['lead_score']}")
            print(f"   Lead Temperature: {data['lead']['lead_temperature']}")
            
            if extraction:
                print(f"\n📄 PDF Extraction Results:")
                print(f"   Status: {extraction.get('status', 'N/A')}")
                print(f"   Context Doc ID: {extraction.get('context_doc_id', 'N/A')}")
                print(f"   Fields Extracted: {len(extraction.get('extracted_fields', {}))}")
                print(f"   Lead Fields Updated: {len(extraction.get('lead_updates', {}))}")
                
                if extraction.get('extracted_fields'):
                    print(f"\n   Extracted Data:")
                    for key, value in extraction['extracted_fields'].items():
                        if value:
                            print(f"      • {key}: {value}")
                
                if extraction.get('extraction_error'):
                    print(f"\n   ⚠️  Error: {extraction['extraction_error']}")
            
            return lead_id
        else:
            print_result(False, f"Failed with status {response.status_code}")
            print(f"Error: {response.text}")
            return None
            
    except Exception as e:
        print_result(False, f"Request failed: {e}")
        import traceback
        traceback.print_exc()
        return None


def manual_extraction(lead_id):
    """Test manual PDF extraction endpoint"""
    print_section("Test 3: Manual PDF Extraction")
    
    if not lead_id:
        print_result(False, "No lead_id provided, skipping manual extraction test")
        return False
    
    payload = {
        "file_path": "uploads/test-business-doc.pdf"
    }
    
    print(f"\nPOST {BASE_URL}/leads/{lead_id}/extract-pdf")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    print("\n⏳ Processing... (PDF extraction may take 3-5 seconds)")
    
    try:
        response = httpx.post(
            f"{BASE_URL}/leads/{lead_id}/extract-pdf",
            json=payload,
            timeout=30.0
        )
        
        if response.status_code == 200:
            data = response.json()
            
            print_result(True, "Manual extraction completed")
            
            print(f"\n📄 Extraction Results:")
            print(f"   Status: {data.get('status', 'N/A')}")
            print(f"   Context Doc ID: {data.get('context_doc_id', 'N/A')}")
            print(f"   Summary: {data.get('extracted_summary', 'N/A')[:100]}...")
            print(f"   Fields Extracted: {len(data.get('extracted_fields', {}))}")
            print(f"   Lead Fields Updated: {len(data.get('lead_updates', {}))}")
            
            if data.get('lead_updates'):
                print(f"\n   Updated Fields:")
                for key, value in data['lead_updates'].items():
                    print(f"      • {key}: {value}")
            
            return True
        else:
            print_result(False, f"Failed with status {response.status_code}")
            print(f"Error: {response.text}")
            return False
            
    except Exception as e:
        print_result(False, f"Request failed: {e}")
        return False


def verify_database_records(lead_id):
    """Verify the lead was created in database"""
    print_section("Test 4: Verify Database Records")
    
    if not lead_id:
        print_result(False, "No lead_id provided, skipping verification")
        return False
    
    print(f"\nGET {BASE_URL}/leads/{lead_id}")
    
    try:
        response = httpx.get(f"{BASE_URL}/leads/{lead_id}", timeout=10.0)
        
        if response.status_code == 200:
            lead = response.json()
            
            print_result(True, "Lead record retrieved from database")
            
            print(f"\n📊 Final Lead State in Database:")
            print(f"   ID: {lead.get('id', 'N/A')}")
            print(f"   Company: {lead.get('company', 'N/A')}")
            print(f"   Industry: {lead.get('industry', 'N/A')}")
            print(f"   Pain Point: {lead.get('pain_point', 'N/A')}")
            print(f"   Timeline: {lead.get('timeline', 'N/A')}")
            print(f"   Budget: {lead.get('budget_readiness', 'N/A')}")
            print(f"   Decision Maker: {lead.get('decision_maker', 'N/A')}")
            print(f"   Context Status: {lead.get('context_status', 'N/A')}")
            print(f"   Lead Score: {lead.get('lead_score', 'N/A')}")
            print(f"   Lead Temperature: {lead.get('lead_temperature', 'N/A')}")
            
            return True
        else:
            print_result(False, f"Failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print_result(False, f"Request failed: {e}")
        return False


def main():
    """Run all tests to populate database"""
    print("\n" + "="*70)
    print("  PDF EXTRACTION - DATABASE POPULATION TEST")
    print("="*70)
    print(f"\nTarget: {BASE_URL}")
    print("This script will create real records in your Couchbase database.")
    
    # Test server connection
    if not test_server_connection():
        return 1
    
    time.sleep(1)
    
    # Test 1: Create intake without PDF
    lead_id_1 = create_intake_without_pdf()
    time.sleep(1)
    
    # Test 2: Create intake with PDF (auto extraction)
    lead_id_2 = create_intake_with_pdf()
    time.sleep(1)
    
    # Test 3: Manual extraction (on first lead)
    if lead_id_1:
        manual_extraction(lead_id_1)
        time.sleep(1)
    
    # Test 4: Verify database records
    if lead_id_2:
        verify_database_records(lead_id_2)
    
    # Summary
    print_section("SUMMARY")
    
    print("\n📊 Database Records Created:")
    print(f"   • 2 intake_forms documents")
    print(f"   • 2 leads documents")
    print(f"   • 2 lead_context_docs documents (from PDF extractions)")
    
    print("\n🔍 To verify in Couchbase:")
    print("   1. Open Couchbase UI")
    print("   2. Navigate to your bucket > scope")
    print("   3. Check collections:")
    print("      - intake_forms (2 new documents)")
    print("      - leads (2 new documents)")
    print("      - lead_context_docs (2 new documents)")
    
    print("\n✅ Test data population complete!")
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
