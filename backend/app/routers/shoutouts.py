"""ES117 Backend — Shoutout Wall Routes"""
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite

from app.auth import get_current_user, require_user
from app.database import get_db
from app.models import ShoutoutCreate, ShoutoutOut

router = APIRouter(prefix="/api/shoutouts", tags=["shoutouts"])


@router.get("", response_model=list[ShoutoutOut])
async def list_shoutouts(db: aiosqlite.Connection = Depends(get_db)):
    """Get all shoutouts (public, no auth needed)."""
    rows = await db.execute("""
        SELECT s.id, s.message, u.name, s.created_at
        FROM shoutouts s
        LEFT JOIN users u ON s.user_id = u.id
        ORDER BY s.created_at DESC
    """)
    results = await rows.fetchall()
    return [
        ShoutoutOut(id=r[0], message=r[1], author_name=r[2], created_at=r[3])
        for r in results
    ]


@router.post("", response_model=ShoutoutOut, status_code=201)
async def create_shoutout(
    data: ShoutoutCreate,
    user=Depends(require_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Post a new shoutout (login required)."""
    msg = data.message.strip()
    if not msg or len(msg) > 500:
        raise HTTPException(400, "Message must be 1-500 characters")

    user_id = int(user["sub"])
    cursor = await db.execute(
        "INSERT INTO shoutouts (message, user_id) VALUES (?, ?)",
        (msg, user_id)
    )
    await db.commit()

    # Fetch the created row
    row = await db.execute("""
        SELECT s.id, s.message, u.name, s.created_at
        FROM shoutouts s JOIN users u ON s.user_id = u.id
        WHERE s.id = ?
    """, (cursor.lastrowid,))
    r = await row.fetchone()
    return ShoutoutOut(id=r[0], message=r[1], author_name=r[2], created_at=r[3])
