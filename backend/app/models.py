"""ES117 Backend — Pydantic Models"""
from pydantic import BaseModel
from typing import Optional

# --- Auth ---
class UserOut(BaseModel):
    id: int
    email: str
    name: str
    picture: str = ""

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

# --- Shoutouts ---
class ShoutoutCreate(BaseModel):
    message: str

class ShoutoutOut(BaseModel):
    id: int
    message: str
    author_name: Optional[str] = None
    created_at: str

# --- Polls ---
class PollOptionCreate(BaseModel):
    text: str

class PollCreate(BaseModel):
    question: str
    options: list[PollOptionCreate]

class PollOptionOut(BaseModel):
    id: int
    text: str
    votes: int = 0

class PollOut(BaseModel):
    id: int
    question: str
    is_active: bool
    options: list[PollOptionOut]
    user_voted_option: Optional[int] = None
    created_at: str

class VoteCreate(BaseModel):
    option_id: int
