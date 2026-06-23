from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import asyncio

app = FastAPI()

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