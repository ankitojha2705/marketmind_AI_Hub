from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID

from .document import RetrievedChunk


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    max_chunks: Optional[int] = 5


class ChatResponse(BaseModel):
    response: str
    sources: List[RetrievedChunk]
    session_id: str


class ChatMessageResponse(BaseModel):
    id: UUID
    message_type: str
    content: str
    context_chunks: List[UUID]
    created_at: datetime
    
    class Config:
        from_attributes = True


class ChatHistoryResponse(BaseModel):
    messages: List[ChatMessageResponse]
    session_id: str
