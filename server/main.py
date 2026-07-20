import os
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator
from contextlib import asynccontextmanager
from typing import Optional, List
#uncomment when deploy
#from server.slgcn import load_ensemble, run_inference
#delete when deploy

USE_MOCK_INFERENCE = os.getenv("USE_MOCK_INFERENCE", "false").lower() == "true"

if USE_MOCK_INFERENCE:
    def load_ensemble(checkpoints_dir=None):
        print("[MOCK] Skipping real model load, using fake ensemble")
        return None

    def run_inference(classifier_input, ensemble):
        print("[MOCK] Returning fake inference results")
        return {
            "top_k": [
                ("HELLO", 0.95),
                ("THANKS", 0.87),
                ("PLEASE", 0.72),
                ("SORRY", 0.65),
                ("YES", 0.51),
                ("NO", 0.45)
            ]
        }
else:
    from server.slgcn import load_ensemble, run_inference
from enum import Enum
import uuid
import asyncio


WEIGHTS_DIR = "/var/www/asldictionary/asl_summer26/server/sl-gcn-deploy/weights"


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.ensemble = load_ensemble(checkpoints_dir=WEIGHTS_DIR)
    yield


app = FastAPI(lifespan=lifespan)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# request/response models
class DetectedHand(BaseModel):
    label: str  # "right" or "left"
    score: float  # probability of predicted handedness
    landmarks: List[
        float
    ]  # flat 63-length list of floats representing the hand landmarks (21 landmarks * xyz)


class FramesPayload(BaseModel):
    frame_count: int = Field(
        alias="frameCount"
    )  # later rename frontend field to snake_case keys instead of camelCase and remove alias
    extracted_at: str = Field(alias="extractedAt")  # ISO timestramp string
    pose: List[
        List[float]
    ]  # one entry per frame, each entry is a flat 99-length list of floats representing the pose landmarks (33 landmarks * xyz)
    hands: Optional[List[List[DetectedHand]]] = (
        None  # one entry per frame, each entry is a list of DetectedHand objects (optional until implemented), hands[frame_idx] = list of 0-2 DetectedHand objects for that frame
    )

    # catch mismatched frame_count and pose length
    @model_validator(mode="after")
    def check_counts(self):
        if len(self.pose) != self.frame_count:
            raise ValueError("frame_count does not match length of pose data")
        return self

    class Config:
        validate_by_name = True  # or populate_by_name??
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
    accurate: bool  # idk if need this


class Match(BaseModel):
    word: str
    confidence: float


class JobResult(BaseModel):
    matches: List[Match]  # ranked top-k candidates, matches[0] is the top pick
    feedback: List[
        Feedback
    ]  # CLS1 feedback is only computed against matches[0], not the other candidates


class JobResponse(BaseModel):
    job_id: str
    status: JobStatus
    stage: Optional[JobStage] = None
    error: Optional[str] = None
    result: Optional[JobResult] = None
    debug: Optional[dict] = None

class UserFeedback(BaseModel):
    # chosen_label: str
    video_consent: bool
    # match_rank: int
    # match_score: float
    # dataset_video_id: Optional[int]=None
    # is_correct_match_listed: bool
    # open_response_text: Optional[str] = None


# eventually move to redis + celery for async job processing, but for now just store in memory
jobs: dict[str, JobResponse] = {}
job_payloads: dict[str, FramesPayload] = {}


# API endpoints
@app.post("/api/jobs", response_model=JobResponse)
async def create_job(payload: FramesPayload):
    job_id = str(uuid.uuid4())
    jobs[job_id] = JobResponse(job_id=job_id, status=JobStatus.QUEUED)
    job_payloads[job_id] = (
        payload  # store payload for later processing, in-memory for now, but should be stored in a database or cache like Redis
    )
    # simulate job processing
    asyncio.create_task(dummy_process(job_id))
    return jobs[job_id]


async def dummy_process(job_id: str):
    from server.keyframe import (
        compute_velocities,
        find_signing_region,
        select_keyframes,
        build_classifier_input,
        build_frame_vector,
    )

    try:
        jobs[job_id].status = JobStatus.RUNNING
        payload = job_payloads[job_id]
        jobs[job_id].stage = JobStage.KEYFRAME

        velocities = compute_velocities(payload.pose, payload.hands)
        signing_start, signing_end = find_signing_region(velocities)
        keyframe_indices = select_keyframes(payload.pose, payload.hands)
        classifier_input = build_classifier_input(
            payload.pose, payload.hands, keyframe_indices
        )

        jobs[job_id].debug = {
            "total_frames": len(payload.pose),
            "signing_region": {"start": signing_start, "end": signing_end},
            "keyframes_selected": len(keyframe_indices),
            "keyframe_indices": keyframe_indices,
            "reduction_ratio": round(len(keyframe_indices) / len(payload.pose), 2),
            "velocities": velocities,
            "classifier_input_shape": classifier_input.shape,
            "classifier_input": classifier_input.tolist(),
        }

        jobs[job_id].stage = JobStage.CLS0_MATCHING
        print(f"[{job_id}] calling run_inference, input shape={classifier_input.shape}", flush=True)
        inference = await asyncio.to_thread(
            run_inference, classifier_input, app.state.ensemble
        )
        print(f"[{job_id}] run_inference returned: {inference['top_k']}", flush=True)
        top_matches = [
            Match(word=gloss, confidence=score)
            for gloss, score in inference["top_k"][:5]
        ]

        await asyncio.sleep(3)
        jobs[job_id].stage = JobStage.CLS1_FEEDBACK
        # CLS1 receives keyframe_pose and keyframe_hands

        await asyncio.sleep(3)
        jobs[job_id].status = JobStatus.COMPLETED
        jobs[job_id].result = JobResult(
            matches=top_matches,
            feedback=[
                Feedback(
                    feature="Handshape",
                    user_value="user example 1",
                    user_confidence=0.9,
                    reference_value="ref example 1",
                    similarity_score=0.9,
                    accurate=True,
                ),
                Feedback(
                    feature="Movement",
                    user_value="user example 2",
                    user_confidence=0.8,
                    reference_value="ref example 2",
                    similarity_score=0.8,
                    accurate=True,
                ),
                Feedback(
                    feature="Location",
                    user_value="user example 3",
                    user_confidence=0.85,
                    reference_value="ref example 3",
                    similarity_score=0.85,
                    accurate=True,
                ),
                Feedback(
                    feature="Palm Orientation",
                    user_value="user example 4",
                    user_confidence=0.75,
                    reference_value="ref example 4",
                    similarity_score=0.75,
                    accurate=True,
                ),
            ],
        )

    except Exception as e:
        import traceback

        jobs[job_id].status = JobStatus.FAILED
        jobs[job_id].error = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"


@app.get("/api/jobs/{job_id}", response_model=JobResponse)
async def get_job(job_id: str):
    job = jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

# @app.post("/api/jobs/{job_id}/feedback", status_code=status.HTTP_201_CREATED)
# async def save_user_feedback(job_id: str, feedback: UserFeedback):
#     # if job_id not in jobs:
#     #     raise HTTPException(status_code=404, detail="Job not found")
#     # feedback_store[job_id] = feedback

#     # log feedback for now
#     print(f"\n[FEEDBACK REECEIVED] Job ID: {job_id}")
#     print(f"Matched Correctly: {feedback.is_correct_match_listed}")
#     if feedback.is_correct_match_listed:
#         print(f"User Confirmed Match: {feedback.chosen_label}")
#     else: 
#         print(f"User Intended Word: {feedback.open_response_text}")
#         print(f"User Allowed Video Debugging: {feedback.allow_video_debugging}")
#     print("-" * 40)
    
#     return {"message": "Feedback submitted successfully."}
class UserFeedbackPayload(BaseModel):
    matchedCorrectly: bool
    chosenLabel: Optional[str] = None
    intendedWord: Optional[str] = None
    allowVideoUse: Optional[bool] = False

# --- Add this route handler to main.py ---

@app.post("/api/jobs/{job_id}/feedback")
async def submit_feedback(job_id: str, payload: UserFeedbackPayload):
    # Verify the job exists
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Store or log the feedback (e.g., save to a database, file, or log)
    print(f"Received feedback for job {job_id}: {payload.model_dump_json()}")

    # Optional: Update the stored job object
    # jobs[job_id].user_feedback = payload.dict()

    return {"status": "success", "message": "Feedback recorded"}