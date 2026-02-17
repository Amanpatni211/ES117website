"""ES117 Backend — Auth Routes"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
import aiosqlite

from app.auth import get_google_login_url, exchange_code, create_jwt, get_current_user, require_user
from app.config import ALLOWED_DOMAIN, GOOGLE_CLIENT_ID
from app.database import get_db
from app.models import UserOut, TokenOut

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/login")
async def login(redirect: str = ""):
    """Redirect user to Google OAuth consent screen."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(503, "OAuth not configured. Set ES117_GOOGLE_CLIENT_ID env var.")
    url = get_google_login_url(state=redirect)
    return RedirectResponse(url)


@router.get("/callback")
async def callback(code: str, state: str = "", db: aiosqlite.Connection = Depends(get_db)):
    """Handle Google OAuth callback."""
    # Exchange code for user info
    user_info = await exchange_code(code)
    email = user_info.get("email", "")
    name = user_info.get("name", "")
    picture = user_info.get("picture", "")

    # Verify domain
    if not email.endswith(f"@{ALLOWED_DOMAIN}"):
        raise HTTPException(403, f"Only @{ALLOWED_DOMAIN} emails are allowed")

    # Upsert user
    existing = await db.execute("SELECT id FROM users WHERE email = ?", (email,))
    row = await existing.fetchone()
    if row:
        user_id = row[0]
        await db.execute("UPDATE users SET name = ?, picture = ? WHERE id = ?", (name, picture, user_id))
    else:
        cursor = await db.execute(
            "INSERT INTO users (email, name, picture) VALUES (?, ?, ?)",
            (email, name, picture)
        )
        user_id = cursor.lastrowid
    await db.commit()

    # Create JWT
    token = create_jwt(user_id, email)

    # Redirect to frontend with token
    frontend_url = state or "https://amanpatni211.github.io/ES117website"
    return RedirectResponse(f"{frontend_url}?token={token}")


@router.get("/me", response_model=UserOut)
async def me(user=Depends(require_user), db: aiosqlite.Connection = Depends(get_db)):
    """Get current user info."""
    row = await db.execute("SELECT id, email, name, picture FROM users WHERE id = ?", (int(user["sub"]),))
    u = await row.fetchone()
    if not u:
        raise HTTPException(404, "User not found")
    return UserOut(id=u[0], email=u[1], name=u[2], picture=u[3])
