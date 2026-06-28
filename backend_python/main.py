import os
import uvicorn
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .config import PORT, GEMINI_API_KEY
from .agent import execute_agent_turn
from .sensing import analyze_visual_sensing
from .learning import analyze_municipal_patterns

app = FastAPI(
    title="IntelliStreet Civic AI Backend",
    description="Python compute, LLM sensing, Agentic workflows, and predictive pattern learning for IntelliStreet.",
    version="1.0.0"
)

# Enable CORS since Next.js and Python run on different local ports (3000 vs 8000) inside the same container
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AgentRequest(BaseModel):
    prompt: str

class SensingRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"
    file_name: str = "sensing_capture"

@app.get("/")
def health_check():
    return {
        "status": "online",
        "service": "IntelliStreet Python Sidecar Engine",
        "gemini_api_configured": GEMINI_API_KEY is not None,
        "engine": "FastAPI + google-genai"
    }

@app.post("/api/python/agent")
def run_agent_workflow(req: AgentRequest):
    if not req.prompt:
        raise HTTPException(status_code=400, detail="Prompt is required for agent execution.")
    try:
        result = execute_agent_turn(req.prompt)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/python/sensing/analyze")
def run_visual_sensing(req: SensingRequest):
    if not req.image_base64:
        raise HTTPException(status_code=400, detail="image_base64 data is required.")
    try:
        result = analyze_visual_sensing(req.image_base64, req.mime_type, req.file_name)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/python/learning/patterns")
def run_pattern_learning():
    try:
        result = analyze_municipal_patterns()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # In sandbox, run locally on configured port
    uvicorn.run("main:app", host="127.0.0.1", port=PORT, reload=False)
