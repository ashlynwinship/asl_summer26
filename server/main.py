from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncio

app = FastAPI()

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)

@app.post("/pose-json")
async def pose_coordinates_json(item: Item):
    return {"message": "dummy"}

@app.post("/run-script")
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