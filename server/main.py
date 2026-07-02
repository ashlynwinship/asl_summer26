from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware 
from pydantic import BaseModel, Field, model_validator
from typing import Optional, List
from enum import Enum
import uuid
import asyncio

app = FastAPI()

app.add_middleware(
    CORSMiddleware, allow_origins=["http://localhost:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)

# request/response models
class DetectedHand(BaseModel):
    label: str # "right" or "left"
    score: float # probability of predicted handedness
    landmarks: List[float] # flat 63-length list of floats representing the hand landmarks (21 landmarks * xyz)

class FramesPayload(BaseModel):
    frame_count: int = Field(alias="frameCount") # later rename frontend field to snake_case keys instead of camelCase and remove alias
    landmarks_per_frame: int = Field(alias="landmarksPerFrame")
    extracted_at: str = Field(alias="extractedAt") # ISO timestramp string
    pose: List[List[float]] # one entry per frame, each entry is a flat 99-length list of floats representing the pose landmarks (33 landmarks * xyz)
    hands: Optional[List[List[DetectedHand]]] = None # one entry per frame, each entry is a list of DetectedHand objects (optional until implemented), hands[frame_idx] = list of 0-2 DetectedHand objects for that frame

    # catch mismatched frame_count and pose length
    @model_validator(mode="after")
    def check_counts(self):
        if len(self.pose) != self.frame_count:
            raise ValueError("frame_count does not match length of pose data")
        return self

    class Config:
        validate_by_name = True # or populate_by_name??
        validate_by_alias = True

class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class JobStage(str, Enum):
    KEYFRAME = "keyframe_selection"
    CLS0_MATCHING = "cls0_matching"
    CLS1_FEEDBACK = "cls1_feedback"

class Feedback(BaseModel):
    feature: str
    user_value: str
    user_confidence: float
    reference_value: str
    similarity_score: float
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
async def create_job(payload: FramesPayload):
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
    jobs[job_id].result = JobResult(matched_word="example", match_confidence=0.95, feedback=[
        Feedback(feature="Handshape", user_value="example", user_confidence=0.9, reference_value="example", similarity_score=0.9, accurate=True), 
        Feedback(feature="Movement", user_value="example", user_confidence=0.8, reference_value="example", similarity_score=0.8, accurate=True),
        Feedback(feature="Location", user_value="example", user_confidence=0.85, reference_value="example", similarity_score=0.85, accurate=True),
        Feedback(feature="Palm Orientation", user_value="example", user_confidence=0.75, reference_value="example", similarity_score=0.75, accurate=True),
        ])

@app.get("/api/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: str):
    job = jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job