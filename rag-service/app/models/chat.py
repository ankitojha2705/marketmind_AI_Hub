from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from ..db import Base


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    brand_id = Column(String(255), nullable=False)
    user_id = Column(String(255), nullable=False)
    message_type = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    context_chunks = Column(JSONB, default=list)  # IDs of retrieved chunks
    chat_metadata = Column(JSONB, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Optional session tracking for conversation history
    session_id = Column(String(255), nullable=True)
