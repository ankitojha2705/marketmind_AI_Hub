from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID


class DocumentUploadResponse(BaseModel):
    id: UUID
    filename: str
    file_type: str
    file_size: int
    chunks_created: int
    message: str


class DocumentResponse(BaseModel):
    id: UUID
    filename: str
    file_type: str
    file_size: int
    created_at: datetime
    updated_at: datetime
    doc_metadata: Dict[str, Any]

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    documents: List[DocumentResponse]
    total: int


class ChunkResponse(BaseModel):
    id: UUID
    document_id: UUID
    chunk_index: int
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class RetrievedChunk(BaseModel):
    chunk_id: UUID
    document_id: UUID
    document_filename: str
    chunk_index: int
    content: str
    similarity_score: float
