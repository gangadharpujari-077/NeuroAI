from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import PyPDF2
import docx
import io
import json
from emergentintegrations.llm.chat import LlmChat, UserMessage
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

# Get API key
EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# WebSocket connections manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, interview_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[interview_id] = websocket

    def disconnect(self, interview_id: str):
        if interview_id in self.active_connections:
            del self.active_connections[interview_id]

    async def send_message(self, interview_id: str, message: dict):
        if interview_id in self.active_connections:
            await self.active_connections[interview_id].send_json(message)

manager = ConnectionManager()

# Models
class JobDescription(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    required_skills: List[str]
    preferred_experience: str
    role_expectations: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CandidateResume(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    skills: List[str]
    experience: str
    projects: List[str]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class IntegrityFlag(BaseModel):
    timestamp: datetime
    flag_type: str
    description: str

class Interview(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    job_description_id: str
    candidate_resume_id: str
    status: str  # scheduled, in_progress, completed
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    questions_asked: List[str] = []
    integrity_flags: List[Dict[str, Any]] = []
    evaluation: Optional[Dict[str, Any]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InterviewSetupRequest(BaseModel):
    jd_text: Optional[str] = None
    resume_text: Optional[str] = None
    job_title: str
    candidate_name: str
    candidate_email: str

class RoleFitAnalysis(BaseModel):
    skill_match_level: str
    experience_relevance: str
    project_alignment: str
    analysis_summary: str
    match_score: int

class EvaluationReport(BaseModel):
    interview_id: str
    role_fit: Dict[str, Any]
    performance: Dict[str, Any]
    behavioral_observations: Dict[str, Any]
    integrity_score: Dict[str, Any]
    strengths: List[str]
    weaknesses: List[str]
    recommendation: str

# Helper functions
def extract_text_from_pdf(file_content: bytes) -> str:
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text()
        return text
    except Exception as e:
        logging.error(f"Error extracting PDF: {e}")
        return ""

def extract_text_from_docx(file_content: bytes) -> str:
    try:
        doc = docx.Document(io.BytesIO(file_content))
        text = "\n".join([para.text for para in doc.paragraphs])
        return text
    except Exception as e:
        logging.error(f"Error extracting DOCX: {e}")
        return ""

async def analyze_role_fit(jd_text: str, resume_text: str) -> RoleFitAnalysis:
    """AI-powered role fit analysis"""
    try:
        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id=f"fit_analysis_{uuid.uuid4()}",
            system_message="You are an expert HR analyst. Analyze the candidate's fit for the role."
        ).with_model("openai", "gpt-5.2")

        prompt = f"""Analyze the candidate's fit for this role.

Job Description:
{jd_text}

Candidate Resume:
{resume_text}

Provide analysis in JSON format:
{{
    "skill_match_level": "high/medium/low",
    "experience_relevance": "detailed assessment",
    "project_alignment": "detailed assessment",
    "analysis_summary": "overall summary",
    "match_score": 0-100
}}
"""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        # Parse JSON from response
        import re
        json_match = re.search(r'\{[^}]+\}', response, re.DOTALL)
        if json_match:
            analysis_data = json.loads(json_match.group())
            return RoleFitAnalysis(**analysis_data)
        else:
            # Fallback
            return RoleFitAnalysis(
                skill_match_level="medium",
                experience_relevance="Unable to analyze",
                project_alignment="Unable to analyze",
                analysis_summary=response[:500],
                match_score=50
            )
    except Exception as e:
        logging.error(f"Error in role fit analysis: {e}")
        return RoleFitAnalysis(
            skill_match_level="medium",
            experience_relevance="Analysis pending",
            project_alignment="Analysis pending",
            analysis_summary="Automated analysis unavailable",
            match_score=50
        )

# Routes
@api_router.get("/")
async def root():
    return {"message": "Veritas AI Interview System"}

@api_router.post("/job-description")
async def create_job_description(jd: JobDescription):
    doc = jd.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.job_descriptions.insert_one(doc)
    return jd

@api_router.post("/candidate-resume")
async def create_resume(resume: CandidateResume):
    doc = resume.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.candidate_resumes.insert_one(doc)
    return resume

@api_router.post("/upload/resume")
async def upload_resume(file: UploadFile = File(...)):
    content = await file.read()
    
    if file.filename.endswith('.pdf'):
        text = extract_text_from_pdf(content)
    elif file.filename.endswith('.docx'):
        text = extract_text_from_docx(content)
    else:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files supported")
    
    return {"text": text, "filename": file.filename}

@api_router.post("/upload/job-description")
async def upload_jd(file: UploadFile = File(...)):
    content = await file.read()
    
    if file.filename.endswith('.pdf'):
        text = extract_text_from_pdf(content)
    elif file.filename.endswith('.docx'):
        text = extract_text_from_docx(content)
    else:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files supported")
    
    return {"text": text, "filename": file.filename}

@api_router.post("/interview/setup")
async def setup_interview(request: InterviewSetupRequest):
    # Create JD
    jd = JobDescription(
        title=request.job_title,
        required_skills=[],
        preferred_experience=request.jd_text or "",
        role_expectations=request.jd_text or ""
    )
    jd_doc = jd.model_dump()
    jd_doc['created_at'] = jd_doc['created_at'].isoformat()
    await db.job_descriptions.insert_one(jd_doc)
    
    # Create Resume
    resume = CandidateResume(
        name=request.candidate_name,
        email=request.candidate_email,
        skills=[],
        experience=request.resume_text or "",
        projects=[]
    )
    resume_doc = resume.model_dump()
    resume_doc['created_at'] = resume_doc['created_at'].isoformat()
    await db.candidate_resumes.insert_one(resume_doc)
    
    # Create Interview
    interview = Interview(
        job_description_id=jd.id,
        candidate_resume_id=resume.id,
        status="scheduled"
    )
    interview_doc = interview.model_dump()
    interview_doc['created_at'] = interview_doc['created_at'].isoformat()
    await db.interviews.insert_one(interview_doc)
    
    # Analyze fit
    analysis = await analyze_role_fit(
        request.jd_text or request.job_title,
        request.resume_text or f"Candidate: {request.candidate_name}"
    )
    
    return {
        "interview_id": interview.id,
        "job_description": jd,
        "candidate_resume": resume,
        "role_fit_analysis": analysis
    }

@api_router.get("/interview/{interview_id}")
async def get_interview(interview_id: str):
    interview = await db.interviews.find_one({"id": interview_id}, {"_id": 0})
    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")
    return interview

@api_router.post("/interview/{interview_id}/start")
async def start_interview(interview_id: str):
    result = await db.interviews.update_one(
        {"id": interview_id},
        {"$set": {
            "status": "in_progress",
            "start_time": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Interview not found")
    return {"status": "started"}

@api_router.post("/interview/{interview_id}/end")
async def end_interview(interview_id: str):
    result = await db.interviews.update_one(
        {"id": interview_id},
        {"$set": {
            "status": "completed",
            "end_time": datetime.now(timezone.utc).isoformat()
        }}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Interview not found")
    return {"status": "completed"}

@api_router.post("/interview/{interview_id}/integrity-flag")
async def add_integrity_flag(interview_id: str, flag: IntegrityFlag):
    flag_dict = {
        "timestamp": flag.timestamp.isoformat(),
        "flag_type": flag.flag_type,
        "description": flag.description
    }
    result = await db.interviews.update_one(
        {"id": interview_id},
        {"$push": {"integrity_flags": flag_dict}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Interview not found")
    return {"status": "flag_added"}

@api_router.get("/interviews")
async def get_interviews():
    interviews = await db.interviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return interviews

# WebSocket for real-time interview
@api_router.websocket("/interview/{interview_id}/ws")
async def interview_websocket(websocket: WebSocket, interview_id: str):
    await manager.connect(interview_id, websocket)
    
    # Get interview data
    interview = await db.interviews.find_one({"id": interview_id}, {"_id": 0})
    if not interview:
        await websocket.close()
        return
    
    jd = await db.job_descriptions.find_one({"id": interview['job_description_id']}, {"_id": 0})
    resume = await db.candidate_resumes.find_one({"id": interview['candidate_resume_id']}, {"_id": 0})
    
    # Initialize AI interviewer
    chat = LlmChat(
        api_key=EMERGENT_KEY,
        session_id=interview_id,
        system_message=f"""You are a professional AI interviewer conducting a 25-minute video interview.

Job Description: {jd.get('role_expectations', '')}
Candidate Info: {resume.get('experience', '')}

Rules:
1. Ask ONE clear question at a time
2. Wait for response before next question
3. Probe deeper on vague answers
4. Stay professional and focused
5. Generate contextual follow-ups
6. Do NOT reveal your scoring logic
7. Keep responses brief and interviewer-like
8. Track time internally (25 min total)
"""
    ).with_model("openai", "gpt-5.2")
    
    try:
        # Send initial greeting
        greeting = await chat.send_message(UserMessage(text="Start the interview with a brief introduction and first question."))
        await manager.send_message(interview_id, {
            "type": "ai_message",
            "content": greeting
        })
        
        # Update questions
        await db.interviews.update_one(
            {"id": interview_id},
            {"$push": {"questions_asked": greeting}}
        )
        
        while True:
            data = await websocket.receive_json()
            
            if data.get('type') == 'ping':
                # Respond to heartbeat
                await manager.send_message(interview_id, {"type": "pong"})
                continue
            
            if data.get('type') == 'candidate_response':
                # Send to AI
                response = await chat.send_message(UserMessage(text=data['content']))
                
                await manager.send_message(interview_id, {
                    "type": "ai_message",
                    "content": response
                })
                
                # Update questions
                await db.interviews.update_one(
                    {"id": interview_id},
                    {"$push": {"questions_asked": response}}
                )
            
            elif data.get('type') == 'integrity_flag':
                # Log integrity issue
                flag_dict = {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "flag_type": data.get('flag_type', 'unknown'),
                    "description": data.get('description', '')
                }
                await db.interviews.update_one(
                    {"id": interview_id},
                    {"$push": {"integrity_flags": flag_dict}}
                )
            
            elif data.get('type') == 'integrity_violation':
                # Serious violation - mark interview as failed
                flag_dict = {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "flag_type": "critical_violation",
                    "description": data.get('reason', 'Critical integrity violation'),
                    "action": data.get('action', 'terminate')
                }
                await db.interviews.update_one(
                    {"id": interview_id},
                    {
                        "$push": {"integrity_flags": flag_dict},
                        "$set": {
                            "status": "terminated",
                            "end_time": datetime.now(timezone.utc).isoformat(),
                            "evaluation": {
                                "recommendation": "Unfit - Integrity Violation",
                                "reason": data.get('reason', 'Multiple integrity violations detected'),
                                "integrity_score": 0
                            }
                        }
                    }
                )
                
                # Send termination message
                await manager.send_message(interview_id, {
                    "type": "evaluation",
                    "content": "Interview terminated due to integrity violations"
                })
                break
            
            elif data.get('type') == 'end_interview':
                # Generate evaluation
                eval_prompt = f"""The interview has ended. Generate a comprehensive evaluation report in JSON format:
{{
    "role_fit": {{"skill_alignment": "", "experience_relevance": "", "project_applicability": ""}},
    "performance": {{"communication_clarity": "", "depth_of_understanding": "", "consistency_with_resume": ""}},
    "behavioral_observations": {{"confidence_indicators": "", "nervousness_patterns": "", "responsiveness": ""}},
    "integrity_score": {{"score": 0-100, "suspicious_moments": []}},
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"],
    "recommendation": "Strong fit / Moderate fit / Weak fit"
}}
"""
                evaluation_text = await chat.send_message(UserMessage(text=eval_prompt))
                
                # Save evaluation
                await db.interviews.update_one(
                    {"id": interview_id},
                    {"$set": {"evaluation": {"raw_text": evaluation_text}}}
                )
                
                await manager.send_message(interview_id, {
                    "type": "evaluation",
                    "content": evaluation_text
                })
                break
    
    except WebSocketDisconnect:
        manager.disconnect(interview_id)
    except Exception as e:
        logging.error(f"WebSocket error: {e}")
        manager.disconnect(interview_id)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()