from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware 
from pydantic import BaseModel 
from typing import Optional, List
from enum import Enum
import uuid
import asyncio

app = FastAPI()

app.add_middleware(
    CORSMiddleware, allow_origins=["http://localhost:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)

# request/response models
class Landmark(BaseModel):
    x: float
    y: float
    z: float

# might need to modify based on how we want to structure the data
class LandmarkFrames(BaseModel):
    frame_idx: int
    timestamp_ms: int
    hands: dict # {"right": List[Landmark] | None, "left": List[Landmark] | None}
    pose: List[Landmark]

class LandmarkFramesPayload(BaseModel):
    frames: List[LandmarkFrames]

class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class JobStage(str, Enum):
    KEYFRAME = "keyframe"
    CLS0_MATCHING = "cls0_matching"
    CLS1_FEEDBACK = "cls1_feedback"

class Feedback(BaseModel):
    feature: str
    score: float
    accurate: bool # idk if need this

class JobResult(BaseModel):
    matched_word: str
    match_confidence: float
    feedback: List[Feedback]

class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    stage: Optional[JobStage] = None
    error: Optional[str] = None
    result: Optional[JobResult] = None

# needs to be changed to redis
jobs: dict[str, JobResponse] = {}

# API endpoints
@app.post("/api/jobs", response_model=JobResponse)
async def create_job(payload: LandmarkFramesPayload):
    job_id = str(uuid.uuid4())
    jobs[job_id] = JobResponse(job_id=job_id, status=JobStatus.QUEUED)
    # simulate job processing: asyncio.create_task(), celery task??
    asyncio.create_task(dummy_process(job_id))
    return jobs[job_id]

async def dummy_process(job_id: str):
    await asyncio.sleep(5)  # simulate processing time
    jobs[job_id].status = JobStatus.RUNNING
    jobs[job_id].stage = JobStage.KEYFRAME
    await asyncio.sleep(5)
    jobs[job_id].stage = JobStage.CLS0_MATCHING
    await asyncio.sleep(5)
    jobs[job_id].stage = JobStage.CLS1_FEEDBACK
    await asyncio.sleep(5)
    jobs[job_id].status = JobStatus.COMPLETED
    jobs[job_id].result = JobResult(matched_word="example", match_confidence=0.95, feedback=[Feedback(feature="feature1", score=0.9, accurate=True)])

@app.get("/api/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: str):
    job = jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job