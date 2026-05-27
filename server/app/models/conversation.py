from typing import Literal, Optional
from pydantic import BaseModel, Field


class TranscriptEntry(BaseModel):
    role: Literal["user", "assistant"]
    message: str
    timestamp: str


class Conversation(BaseModel):
    type: str = "conversation"
    lead_id: str
    session_context: Optional[dict[str, str]] = None
    processed_turn_keys: list[str] = Field(default_factory=list)
    transcript: list[TranscriptEntry] = Field(default_factory=list)
    summary: Optional[str] = None
    objections: list[str] = Field(default_factory=list)
    buying_signals: list[str] = Field(default_factory=list)
    tool_activity_log: list[dict] = Field(default_factory=list)
    commerce_state: dict = Field(default_factory=dict)
    created_at: str = ""
    updated_at: str = ""


class ConversationResponse(Conversation):
    id: str
