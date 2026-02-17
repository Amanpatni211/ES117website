"""ES117 Backend — FastAPI Application"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import ALLOWED_ORIGINS
from app.database import init_db
from app.routers import auth_routes, shoutouts, polls


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize database on startup."""
    await init_db()
    print("✅ Database initialized")
    yield


app = FastAPI(
    title="ES117 Backend",
    description="Backend API for ES117 World of Engineering website",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_routes.router)
app.include_router(shoutouts.router)
app.include_router(polls.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ES117 Backend"}


@app.get("/api")
async def api_root():
    return {
        "service": "ES117 Backend",
        "endpoints": {
            "health": "/health",
            "auth_login": "/api/auth/login",
            "auth_me": "/api/auth/me",
            "shoutouts": "/api/shoutouts",
            "polls": "/api/polls",
        }
    }
