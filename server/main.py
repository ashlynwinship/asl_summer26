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

#request/response models
class Landmark(BaseModel):
    x: float
    y: float
    z: float

class Keyframe(BaseModel):
    frame_idx: int
    timestamp_ms: int
    hands: dict # {"right": List[Landmark] | None, "left": List[Landmark] | None}
    pose: List[Landmark]

class KeyframePayload(BaseModel):
    keyframes: List[Keyframe]

class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

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
    stage: Optional[str] = None # stage of computing: cls0 matching, cls1 feedback
    error: Optional[str] = None
    result: Optional[JobResult] = None

jobs: dict[str, JobResponse] = {}

# # delete later
# @app.post("/submit")
# async def accept_json(request: Request):
#     data = await request.json()
#     return {"message": "JSON received", "time": asyncio.get_event_loop().time()}

# @app.post("/api/run-script")
# async def run_script(script: str):
#     # check if script exists (available_scripts doesn't exist yet)
#     if script not in available_scripts: 
#         raise HTTPException(status_code=404, detail="Script not found")
#     # run script
#     process = await asyncio.create_subprocess_exec('python', script, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
#     stdout, stdderr = await process.communicate()
#     if process.returncode != 0:
#         return {"status": "failed", "error": stdderr.decode()}
#     return {"status": "success", "output": stdout.decode()}

# API endpoints
@app.post("/api/jobs", response_model=JobResponse)
async def create_job(payload: KeyframePayload):
    job_id = str(uuid.uuid4())
    jobs[job_id] = JobResponse(job_id=job_id, status=JobStatus.QUEUED)
    # simulate job processing: asyncio.create_task()??

    return jobs[job_id]

@app.get("/api/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: str):
    job = jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job