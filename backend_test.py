import requests
import sys
import json
from datetime import datetime

class AIInterviewAPITester:
    def __init__(self, base_url="https://hireviewer-ai.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.interview_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)

            print(f"Response Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"Response: {json.dumps(response_data, indent=2)[:500]}...")
                    return True, response_data
                except:
                    print(f"Response Text: {response.text[:200]}...")
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"Response: {response.text[:500]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health check endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/",
            200
        )
        return success

    def test_interview_setup(self):
        """Test interview setup endpoint"""
        setup_data = {
            "job_title": "Senior Software Engineer",
            "candidate_name": "John Doe",
            "candidate_email": "john@example.com",
            "jd_text": "Looking for experienced backend developer with Python and FastAPI experience. Must have 5+ years of experience in building scalable web applications.",
            "resume_text": "5 years of Python experience. Worked with FastAPI, Django, and Flask. Built multiple REST APIs and microservices."
        }
        
        success, response = self.run_test(
            "Interview Setup",
            "POST",
            "api/interview/setup",
            200,
            data=setup_data
        )
        
        if success and 'interview_id' in response:
            self.interview_id = response['interview_id']
            print(f"✅ Interview ID captured: {self.interview_id}")
            
            # Verify response structure
            required_fields = ['interview_id', 'job_description', 'candidate_resume', 'role_fit_analysis']
            for field in required_fields:
                if field not in response:
                    print(f"⚠️  Missing field in response: {field}")
                else:
                    print(f"✅ Found required field: {field}")
        
        return success

    def test_get_interviews(self):
        """Test get all interviews endpoint"""
        success, response = self.run_test(
            "Get All Interviews",
            "GET",
            "api/interviews",
            200
        )
        
        if success:
            if isinstance(response, list):
                print(f"✅ Found {len(response)} interviews")
                if len(response) > 0:
                    print(f"✅ Sample interview: {response[0].get('id', 'No ID')}")
            else:
                print(f"⚠️  Expected list, got: {type(response)}")
        
        return success

    def test_get_specific_interview(self):
        """Test get specific interview endpoint"""
        if not self.interview_id:
            print("❌ No interview ID available for testing")
            return False
            
        success, response = self.run_test(
            "Get Specific Interview",
            "GET",
            f"api/interview/{self.interview_id}",
            200
        )
        
        if success:
            # Verify interview structure
            expected_fields = ['id', 'job_description_id', 'candidate_resume_id', 'status', 'created_at']
            for field in expected_fields:
                if field not in response:
                    print(f"⚠️  Missing field in interview: {field}")
                else:
                    print(f"✅ Found interview field: {field}")
        
        return success

    def test_start_interview(self):
        """Test start interview endpoint"""
        if not self.interview_id:
            print("❌ No interview ID available for testing")
            return False
            
        success, response = self.run_test(
            "Start Interview",
            "POST",
            f"api/interview/{self.interview_id}/start",
            200
        )
        return success

    def test_end_interview(self):
        """Test end interview endpoint"""
        if not self.interview_id:
            print("❌ No interview ID available for testing")
            return False
            
        success, response = self.run_test(
            "End Interview",
            "POST",
            f"api/interview/{self.interview_id}/end",
            200
        )
        return success

def main():
    print("🚀 Starting AI Interview API Tests")
    print("=" * 50)
    
    # Setup
    tester = AIInterviewAPITester()
    
    # Run tests in sequence
    tests = [
        ("Health Check", tester.test_health_check),
        ("Interview Setup", tester.test_interview_setup),
        ("Get All Interviews", tester.test_get_interviews),
        ("Get Specific Interview", tester.test_get_specific_interview),
        ("Start Interview", tester.test_start_interview),
        ("End Interview", tester.test_end_interview),
    ]
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            test_func()
        except Exception as e:
            print(f"❌ Test {test_name} failed with exception: {str(e)}")
    
    # Print final results
    print(f"\n{'='*50}")
    print(f"📊 FINAL RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%" if tester.tests_run > 0 else "No tests run")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed - check logs above")
        return 1

if __name__ == "__main__":
    sys.exit(main())