from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware 
from pydantic import BaseModel 
from typing import Optional, List
from enum import Enum
# import asyncio

app = FastAPI()

class Landmark(BaseModel):
    x: float
    y: float
    z: float

class Keyframe(BaseModel):
    frame_idx: int
    time_stamp_mdx: int
    hands: dict # {"right": List[Landmark], "left": List[Landmark]}
    pose: List[Landmark]
    landmarks: List[Landmark]

class KeyframePayload(BaseModel):
    keyframes: List[Keyframe]

class JobStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

class FeedbackItem(BaseModel):
    job_id: str
    status: JobStatus
    error: Optional[str] = None
    result: Optional[JobStatus] = None

app.add_middleware(
    CORSMiddleware, allow_origins=["http://localhost:5173"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)

@app.post("/submit")
async def accept_json(request: Request):
    data = await request.json()
    return {"message": "JSON received", "time": asyncio.get_event_loop().time()}

@app.post("/api/run-script")
async def run_script(script: str):
    # check if script exists (available_scripts doesn't exist yet)
    if script not in available_scripts: 
        raise HTTPException(status_code=404, detail="Script not found")
    # run script
    process = await asyncio.create_subprocess_exec('python', script, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    stdout, stdderr = await process.communicate()
    if process.returncode != 0:
        return {"status": "failed", "error": stdderr.decode()}
    return {"status": "success", "output": stdout.decode()}