import asyncio
import websockets
import json
import requests
from datetime import datetime

class WebSocketTester:
    def __init__(self, base_url="https://hireviewer-ai.preview.emergentagent.com"):
        self.base_url = base_url
        self.interview_id = None
        self.messages_received = []
        
    async def create_interview(self):
        """Create a new interview for WebSocket testing"""
        setup_data = {
            "job_title": "WebSocket Test Engineer",
            "candidate_name": "WebSocket Tester",
            "candidate_email": "websocket@test.com",
            "jd_text": "Testing WebSocket functionality for AI interviews",
            "resume_text": "Experienced in WebSocket testing and real-time communication"
        }
        
        response = requests.post(f"{self.base_url}/api/interview/setup", json=setup_data)
        if response.status_code == 200:
            data = response.json()
            self.interview_id = data['interview_id']
            print(f"✅ Interview created: {self.interview_id}")
            return True
        else:
            print(f"❌ Failed to create interview: {response.status_code}")
            return False
    
    async def start_interview(self):
        """Start the interview via REST API"""
        response = requests.post(f"{self.base_url}/api/interview/{self.interview_id}/start")
        if response.status_code == 200:
            print("✅ Interview started via REST API")
            return True
        else:
            print(f"❌ Failed to start interview: {response.status_code}")
            return False
    
    async def test_websocket_connection(self):
        """Test WebSocket connection and message flow"""
        if not self.interview_id:
            print("❌ No interview ID available")
            return False
        
        # Convert HTTP URL to WebSocket URL
        ws_url = self.base_url.replace('https://', 'wss://').replace('http://', 'ws://')
        ws_url += f"/api/interview/{self.interview_id}/ws"
        
        print(f"🔌 Connecting to WebSocket: {ws_url}")
        
        try:
            async with websockets.connect(ws_url) as websocket:
                print("✅ WebSocket connected successfully")
                
                # Wait for initial AI greeting
                print("⏳ Waiting for AI greeting...")
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=15.0)
                    data = json.loads(message)
                    self.messages_received.append(data)
                    
                    if data.get('type') == 'ai_message':
                        print(f"✅ AI greeting received: {data['content'][:100]}...")
                    else:
                        print(f"⚠️ Unexpected message type: {data.get('type')}")
                    
                except asyncio.TimeoutError:
                    print("❌ Timeout waiting for AI greeting")
                    return False
                
                # Send candidate response
                candidate_message = {
                    "type": "candidate_response",
                    "content": "Hello! I'm excited about this opportunity. I have extensive experience in software development and I'm looking forward to discussing my background with you."
                }
                
                print("📤 Sending candidate response...")
                await websocket.send(json.dumps(candidate_message))
                
                # Wait for AI response
                print("⏳ Waiting for AI response...")
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=15.0)
                    data = json.loads(message)
                    self.messages_received.append(data)
                    
                    if data.get('type') == 'ai_message':
                        print(f"✅ AI response received: {data['content'][:100]}...")
                    else:
                        print(f"⚠️ Unexpected message type: {data.get('type')}")
                    
                except asyncio.TimeoutError:
                    print("❌ Timeout waiting for AI response")
                    return False
                
                # Test integrity flag
                integrity_flag = {
                    "type": "integrity_flag",
                    "flag_type": "test_flag",
                    "description": "Testing integrity flag functionality"
                }
                
                print("🚩 Sending integrity flag...")
                await websocket.send(json.dumps(integrity_flag))
                await asyncio.sleep(1)  # Give time for processing
                
                # Send another candidate response
                candidate_message2 = {
                    "type": "candidate_response", 
                    "content": "I'd like to elaborate on my experience with React and JavaScript. I've worked on several large-scale applications and have experience with state management, testing, and performance optimization."
                }
                
                print("📤 Sending second candidate response...")
                await websocket.send(json.dumps(candidate_message2))
                
                # Wait for second AI response
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=15.0)
                    data = json.loads(message)
                    self.messages_received.append(data)
                    
                    if data.get('type') == 'ai_message':
                        print(f"✅ Second AI response received: {data['content'][:100]}...")
                    else:
                        print(f"⚠️ Unexpected message type: {data.get('type')}")
                        
                except asyncio.TimeoutError:
                    print("❌ Timeout waiting for second AI response")
                
                # End interview
                end_message = {"type": "end_interview"}
                print("🏁 Ending interview...")
                await websocket.send(json.dumps(end_message))
                
                # Wait for evaluation
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=20.0)
                    data = json.loads(message)
                    self.messages_received.append(data)
                    
                    if data.get('type') == 'evaluation':
                        print(f"✅ Evaluation received: {data['content'][:100]}...")
                    else:
                        print(f"⚠️ Unexpected message type: {data.get('type')}")
                        
                except asyncio.TimeoutError:
                    print("❌ Timeout waiting for evaluation")
                
                print(f"✅ WebSocket test completed. Received {len(self.messages_received)} messages")
                return True
                
        except Exception as e:
            print(f"❌ WebSocket connection failed: {str(e)}")
            return False
    
    async def verify_interview_data(self):
        """Verify interview data was saved correctly"""
        response = requests.get(f"{self.base_url}/api/interview/{self.interview_id}")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Interview status: {data.get('status')}")
            print(f"✅ Questions asked: {len(data.get('questions_asked', []))}")
            print(f"✅ Integrity flags: {len(data.get('integrity_flags', []))}")
            
            if data.get('evaluation'):
                print("✅ Evaluation saved")
            else:
                print("⚠️ No evaluation found")
                
            return True
        else:
            print(f"❌ Failed to get interview data: {response.status_code}")
            return False

async def main():
    print("🚀 Starting WebSocket Integration Test")
    print("=" * 50)
    
    tester = WebSocketTester()
    
    # Create interview
    if not await tester.create_interview():
        return 1
    
    # Start interview
    if not await tester.start_interview():
        return 1
    
    # Test WebSocket functionality
    if not await tester.test_websocket_connection():
        return 1
    
    # Verify data persistence
    await asyncio.sleep(2)  # Give time for data to be saved
    await tester.verify_interview_data()
    
    print("\n" + "=" * 50)
    print("🎉 WebSocket integration test completed successfully!")
    return 0

if __name__ == "__main__":
    import sys
    sys.exit(asyncio.run(main()))