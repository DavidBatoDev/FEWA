from typing import Literal, Optional
from pydantic import BaseModel


class TranscriptEntry(BaseModel):
    role: Literal["user", "assistant"]
    message: str
    timestamp: str


class Conversation(BaseModel):
    type: str = "conversation"
    lead_id: str
    transcript: list[TranscriptEntry] = []
    summary: Optional[str] = None
    objections: list[str] = []
    buying_signals: list[str] = []
    created_at: str = ""
    updated_at: str = ""


class ConversationResponse(Conversation):
    id: str
