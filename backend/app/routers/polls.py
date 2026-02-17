"""ES117 Backend — Polls Routes"""
from fastapi import APIRouter, Depends, HTTPException
import aiosqlite

from app.auth import get_current_user, require_user
from app.database import get_db
from app.models import PollCreate, PollOut, PollOptionOut, VoteCreate

router = APIRouter(prefix="/api/polls", tags=["polls"])


@router.get("", response_model=list[PollOut])
async def list_polls(
    user=Depends(get_current_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Get all active polls with vote counts (public)."""
    polls_rows = await db.execute(
        "SELECT id, question, is_active, created_at FROM polls WHERE is_active = 1 ORDER BY created_at DESC"
    )
    polls = await polls_rows.fetchall()
    result = []
    for p in polls:
        poll_id = p[0]
        # Get options with vote counts
        opts_rows = await db.execute("""
            SELECT po.id, po.text, COUNT(pv.id) as votes
            FROM poll_options po
            LEFT JOIN poll_votes pv ON po.id = pv.option_id
            WHERE po.poll_id = ?
            GROUP BY po.id
        """, (poll_id,))
        opts = await opts_rows.fetchall()
        options = [PollOptionOut(id=o[0], text=o[1], votes=o[2]) for o in opts]

        # Check if current user already voted
        user_voted = None
        if user:
            vote_row = await db.execute(
                "SELECT option_id FROM poll_votes WHERE poll_id = ? AND user_id = ?",
                (poll_id, int(user["sub"]))
            )
            v = await vote_row.fetchone()
            if v:
                user_voted = v[0]

        result.append(PollOut(
            id=poll_id, question=p[1], is_active=bool(p[2]),
            options=options, user_voted_option=user_voted, created_at=p[3]
        ))
    return result


@router.post("", response_model=PollOut, status_code=201)
async def create_poll(
    data: PollCreate,
    user=Depends(require_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Create a new poll (login required, intended for instructors)."""
    if len(data.options) < 2:
        raise HTTPException(400, "Poll needs at least 2 options")

    cursor = await db.execute("INSERT INTO polls (question) VALUES (?)", (data.question,))
    poll_id = cursor.lastrowid
    for opt in data.options:
        await db.execute(
            "INSERT INTO poll_options (poll_id, text) VALUES (?, ?)",
            (poll_id, opt.text)
        )
    await db.commit()

    # Return created poll
    opts_rows = await db.execute("SELECT id, text FROM poll_options WHERE poll_id = ?", (poll_id,))
    opts = await opts_rows.fetchall()
    return PollOut(
        id=poll_id, question=data.question, is_active=True,
        options=[PollOptionOut(id=o[0], text=o[1], votes=0) for o in opts],
        created_at="", user_voted_option=None
    )


@router.post("/{poll_id}/vote")
async def vote(
    poll_id: int,
    data: VoteCreate,
    user=Depends(require_user),
    db: aiosqlite.Connection = Depends(get_db),
):
    """Vote on a poll (login required, one vote per user)."""
    user_id = int(user["sub"])

    # Verify poll exists and is active
    poll = await db.execute("SELECT is_active FROM polls WHERE id = ?", (poll_id,))
    p = await poll.fetchone()
    if not p:
        raise HTTPException(404, "Poll not found")
    if not p[0]:
        raise HTTPException(400, "Poll is closed")

    # Verify option belongs to poll
    opt = await db.execute(
        "SELECT id FROM poll_options WHERE id = ? AND poll_id = ?",
        (data.option_id, poll_id)
    )
    if not await opt.fetchone():
        raise HTTPException(400, "Invalid option for this poll")

    # Check if already voted
    existing = await db.execute(
        "SELECT id FROM poll_votes WHERE poll_id = ? AND user_id = ?",
        (poll_id, user_id)
    )
    if await existing.fetchone():
        # Update vote
        await db.execute(
            "UPDATE poll_votes SET option_id = ? WHERE poll_id = ? AND user_id = ?",
            (data.option_id, poll_id, user_id)
        )
    else:
        await db.execute(
            "INSERT INTO poll_votes (poll_id, option_id, user_id) VALUES (?, ?, ?)",
            (poll_id, data.option_id, user_id)
        )
    await db.commit()
    return {"status": "ok", "voted": data.option_id}
