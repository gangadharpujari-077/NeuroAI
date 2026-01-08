import requests
import json
import asyncio
import websockets
from datetime import datetime

class ComprehensiveInterviewTest:
    def __init__(self, base_url="https://hireviewer-ai.preview.emergentagent.com"):
        self.base_url = base_url
        self.interview_id = None
        self.tests_passed = 0
        self.tests_total = 0
        
    def test(self, name, condition, details=""):
        """Helper method to track test results"""
        self.tests_total += 1
        if condition:
            self.tests_passed += 1
            print(f"✅ {name}")
            if details:
                print(f"   {details}")
        else:
            print(f"❌ {name}")
            if details:
                print(f"   {details}")
        return condition
    
    def test_interview_setup(self):
        """Test complete interview setup flow"""
        print("\n🔧 Testing Interview Setup Flow...")
        
        setup_data = {
            "job_title": "Full Stack Developer",
            "candidate_name": "Alice Johnson", 
            "candidate_email": "alice@example.com",
            "jd_text": "We are looking for a full stack developer with React and Node.js experience. Must have 3+ years of experience building web applications.",
            "resume_text": "Full stack developer with 4 years experience. Proficient in React, Node.js, MongoDB, and AWS. Built multiple e-commerce and SaaS applications."
        }
        
        response = requests.post(f"{self.base_url}/api/interview/setup", json=setup_data, timeout=30)
        
        if not self.test("Interview Setup API Call", response.status_code == 200, f"Status: {response.status_code}"):
            return False
        
        data = response.json()
        self.interview_id = data.get('interview_id')
        
        # Verify response structure
        self.test("Interview ID Generated", bool(self.interview_id), f"ID: {self.interview_id}")
        self.test("Job Description Created", 'job_description' in data)
        self.test("Candidate Resume Created", 'candidate_resume' in data)
        self.test("Role Fit Analysis Generated", 'role_fit_analysis' in data)
        
        # Verify role fit analysis structure
        if 'role_fit_analysis' in data:
            analysis = data['role_fit_analysis']
            self.test("Match Score Present", 'match_score' in analysis, f"Score: {analysis.get('match_score')}")
            self.test("Skill Match Level Present", 'skill_match_level' in analysis, f"Level: {analysis.get('skill_match_level')}")
        
        return True
    
    def test_interview_retrieval(self):
        """Test interview data retrieval"""
        print("\n📋 Testing Interview Data Retrieval...")
        
        if not self.interview_id:
            self.test("Interview ID Available", False, "No interview ID to test with")
            return False
        
        # Test get specific interview
        response = requests.get(f"{self.base_url}/api/interview/{self.interview_id}", timeout=30)
        self.test("Get Interview API", response.status_code == 200, f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            self.test("Interview Status is Scheduled", data.get('status') == 'scheduled')
            self.test("Interview ID Matches", data.get('id') == self.interview_id)
            self.test("Created At Present", 'created_at' in data)
            self.test("Questions Asked Empty Initially", data.get('questions_asked') == [])
            self.test("Integrity Flags Empty Initially", data.get('integrity_flags') == [])
        
        # Test get all interviews
        response = requests.get(f"{self.base_url}/api/interviews", timeout=30)
        self.test("Get All Interviews API", response.status_code == 200)
        
        if response.status_code == 200:
            interviews = response.json()
            self.test("Interviews List Returned", isinstance(interviews, list))
            interview_ids = [i.get('id') for i in interviews]
            self.test("Our Interview in List", self.interview_id in interview_ids)
        
        return True
    
    def test_interview_lifecycle(self):
        """Test interview start/end lifecycle"""
        print("\n🚀 Testing Interview Lifecycle...")
        
        if not self.interview_id:
            self.test("Interview ID Available", False)
            return False
        
        # Start interview
        response = requests.post(f"{self.base_url}/api/interview/{self.interview_id}/start", timeout=30)
        self.test("Start Interview API", response.status_code == 200, f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            self.test("Start Response Format", data.get('status') == 'started')
        
        # Verify status changed
        response = requests.get(f"{self.base_url}/api/interview/{self.interview_id}", timeout=30)
        if response.status_code == 200:
            data = response.json()
            self.test("Status Updated to In Progress", data.get('status') == 'in_progress')
            self.test("Start Time Set", data.get('start_time') is not None)
        
        # End interview
        response = requests.post(f"{self.base_url}/api/interview/{self.interview_id}/end", timeout=30)
        self.test("End Interview API", response.status_code == 200, f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            self.test("End Response Format", data.get('status') == 'completed')
        
        # Verify final status
        response = requests.get(f"{self.base_url}/api/interview/{self.interview_id}", timeout=30)
        if response.status_code == 200:
            data = response.json()
            self.test("Status Updated to Completed", data.get('status') == 'completed')
            self.test("End Time Set", data.get('end_time') is not None)
        
        return True
    
    async def test_websocket_flow(self):
        """Test complete WebSocket conversation flow"""
        print("\n💬 Testing WebSocket Conversation Flow...")
        
        # Create new interview for WebSocket test
        setup_data = {
            "job_title": "WebSocket Test Position",
            "candidate_name": "WebSocket Tester",
            "candidate_email": "ws@test.com",
            "jd_text": "Testing WebSocket functionality",
            "resume_text": "WebSocket testing experience"
        }
        
        response = requests.post(f"{self.base_url}/api/interview/setup", json=setup_data, timeout=30)
        if response.status_code != 200:
            self.test("WebSocket Test Interview Setup", False, "Failed to create test interview")
            return False
        
        ws_interview_id = response.json()['interview_id']
        
        # Start interview
        response = requests.post(f"{self.base_url}/api/interview/{ws_interview_id}/start", timeout=30)
        self.test("WebSocket Interview Started", response.status_code == 200)
        
        # Test WebSocket connection
        ws_url = self.base_url.replace('https://', 'wss://').replace('http://', 'ws://')
        ws_url += f"/api/interview/{ws_interview_id}/ws"
        
        try:
            async with websockets.connect(ws_url) as websocket:
                self.test("WebSocket Connection Established", True)
                
                # Wait for AI greeting
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=15.0)
                    data = json.loads(message)
                    self.test("AI Greeting Received", data.get('type') == 'ai_message', f"Content length: {len(data.get('content', ''))}")
                except asyncio.TimeoutError:
                    self.test("AI Greeting Received", False, "Timeout waiting for greeting")
                    return False
                
                # Send candidate response
                candidate_msg = {
                    "type": "candidate_response",
                    "content": "Thank you for the opportunity. I'm excited to discuss my qualifications for this position."
                }
                await websocket.send(json.dumps(candidate_msg))
                self.test("Candidate Response Sent", True)
                
                # Wait for AI response
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=15.0)
                    data = json.loads(message)
                    self.test("AI Follow-up Received", data.get('type') == 'ai_message', f"Content length: {len(data.get('content', ''))}")
                except asyncio.TimeoutError:
                    self.test("AI Follow-up Received", False, "Timeout waiting for AI response")
                
                # Test integrity flag
                integrity_msg = {
                    "type": "integrity_flag",
                    "flag_type": "test_flag",
                    "description": "Testing integrity monitoring"
                }
                await websocket.send(json.dumps(integrity_msg))
                self.test("Integrity Flag Sent", True)
                
                # End interview
                end_msg = {"type": "end_interview"}
                await websocket.send(json.dumps(end_msg))
                
                # Wait for evaluation
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=20.0)
                    data = json.loads(message)
                    self.test("Evaluation Generated", data.get('type') == 'evaluation', f"Content length: {len(data.get('content', ''))}")
                except asyncio.TimeoutError:
                    self.test("Evaluation Generated", False, "Timeout waiting for evaluation")
                
        except Exception as e:
            self.test("WebSocket Connection Established", False, f"Error: {str(e)}")
            return False
        
        # Verify data persistence
        await asyncio.sleep(2)
        response = requests.get(f"{self.base_url}/api/interview/{ws_interview_id}", timeout=30)
        if response.status_code == 200:
            data = response.json()
            self.test("Questions Recorded", len(data.get('questions_asked', [])) > 0, f"Count: {len(data.get('questions_asked', []))}")
            self.test("Integrity Flags Recorded", len(data.get('integrity_flags', [])) > 0, f"Count: {len(data.get('integrity_flags', []))}")
            self.test("Evaluation Saved", data.get('evaluation') is not None)
        
        return True
    
    def test_error_handling(self):
        """Test error handling for invalid requests"""
        print("\n🚨 Testing Error Handling...")
        
        # Test invalid interview ID
        response = requests.get(f"{self.base_url}/api/interview/invalid-id", timeout=30)
        self.test("Invalid Interview ID Handling", response.status_code == 404)
        
        # Test starting non-existent interview
        response = requests.post(f"{self.base_url}/api/interview/invalid-id/start", timeout=30)
        self.test("Start Invalid Interview Handling", response.status_code == 404)
        
        # Test ending non-existent interview
        response = requests.post(f"{self.base_url}/api/interview/invalid-id/end", timeout=30)
        self.test("End Invalid Interview Handling", response.status_code == 404)
        
        return True

async def main():
    print("🧪 COMPREHENSIVE AI INTERVIEW SYSTEM TEST")
    print("=" * 60)
    
    tester = ComprehensiveInterviewTest()
    
    # Run all tests
    tests = [
        ("Interview Setup", tester.test_interview_setup),
        ("Interview Retrieval", tester.test_interview_retrieval),
        ("Interview Lifecycle", tester.test_interview_lifecycle),
        ("WebSocket Flow", tester.test_websocket_flow),
        ("Error Handling", tester.test_error_handling)
    ]
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            if asyncio.iscoroutinefunction(test_func):
                await test_func()
            else:
                test_func()
        except Exception as e:
            print(f"❌ Test {test_name} failed with exception: {str(e)}")
            tester.tests_total += 1
    
    # Print final results
    print(f"\n{'='*60}")
    print(f"🏆 FINAL TEST RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_total}")
    success_rate = (tester.tests_passed/tester.tests_total)*100 if tester.tests_total > 0 else 0
    print(f"Success rate: {success_rate:.1f}%")
    
    if success_rate >= 90:
        print("🎉 EXCELLENT - System is working very well!")
        return 0
    elif success_rate >= 75:
        print("✅ GOOD - System is mostly functional with minor issues")
        return 0
    else:
        print("⚠️ NEEDS ATTENTION - Multiple issues detected")
        return 1

if __name__ == "__main__":
    import sys
    sys.exit(asyncio.run(main()))