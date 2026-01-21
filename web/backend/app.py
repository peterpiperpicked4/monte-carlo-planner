"""FastAPI main application for Monte Carlo Financial Planning."""
import os
import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Add parent directory to path to import monte_carlo module
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

load_dotenv()

from routes.simulate import router as simulate_router
from routes.ai import router as ai_router

app = FastAPI(
    title="Monte Carlo Financial Planning API",
    description="AI-powered financial planning with Monte Carlo simulations",
    version="1.0.0"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(simulate_router, prefix="/api", tags=["Simulation"])
app.include_router(ai_router, prefix="/api", tags=["AI Analysis"])


@app.get("/")
async def root():
    return {
        "message": "Monte Carlo Financial Planning API",
        "docs": "/docs",
        "endpoints": {
            "simulate": "POST /api/simulate",
            "analyze": "POST /api/analyze"
        }
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
