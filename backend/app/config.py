"""ES117 Backend — Application Configuration"""
import os
from pathlib import Path

# Paths
BACKEND_DIR = Path(__file__).parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
DB_PATH = BACKEND_DIR / "es117.db"

# Server
API_PORT = int(os.getenv("ES117_PORT", "8000"))
ALLOWED_ORIGINS = os.getenv("ES117_ORIGINS", "https://amanpatni211.github.io,http://localhost:3000,http://127.0.0.1:3000").split(",")

# Auth
GOOGLE_CLIENT_ID = os.getenv("ES117_GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("ES117_GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("ES117_GOOGLE_REDIRECT_URI", f"http://localhost:{API_PORT}/api/auth/callback")
JWT_SECRET = os.getenv("ES117_JWT_SECRET", "change-me-in-production-please")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 72

# Allowed email domain
ALLOWED_DOMAIN = "iitgn.ac.in"
