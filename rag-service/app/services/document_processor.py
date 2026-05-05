from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from ..models.document import BrandDocument, DocumentChunk
from ..utils.text_splitter import TextSplitter
from ..utils.file_handler import FileHandler
from ..services.embedding_service import EmbeddingService
from ..config import settings


class DocumentProcessor:
    """Service for processing and storing documents"""

    def __init__(self):
        self.text_splitter = TextSplitter()
        self.file_handler = FileHandler(settings.upload_dir)
        self.embedding_service = EmbeddingService()

    async def process_document(
        self,
        db: AsyncSession,
        brand_id: str,
        filename: str,
        file_content: bytes,
        metadata: dict = None,
    ) -> BrandDocument:
        """Process and store a new document"""

        # Process file
        file_path, file_type, file_size, text_content = self.file_handler.process_file(
            file_content, filename, settings.max_file_size
        )

        # Create document record
        document = BrandDocument(
            brand_id=brand_id,
            filename=filename,
            file_type=file_type,
            file_size=file_size,
            content=text_content,
            doc_metadata=metadata or {},
        )

        db.add(document)
        await db.flush()  # Get the document ID

        # Split text into chunks
        chunks_data = self.text_splitter.split_with_metadata(
            text_content, str(document.id)
        )

        # Generate embeddings for chunks
        chunk_texts = [chunk["content"] for chunk in chunks_data]
        embeddings = await self.embedding_service.generate_embeddings(chunk_texts)

        # Create chunk records
        for i, (chunk_data, embedding) in enumerate(zip(chunks_data, embeddings)):
            chunk = DocumentChunk(
                document_id=document.id,
                chunk_index=chunk_data["chunk_index"],
                content=chunk_data["content"],
                embedding=embedding,
            )
            db.add(chunk)

        await db.commit()
        return document

    async def get_brand_documents(
        self, db: AsyncSession, brand_id: str
    ) -> List[BrandDocument]:
        """Get all documents for a brand"""
        result = await db.execute(
            select(BrandDocument)
            .where(BrandDocument.brand_id == brand_id)
            .order_by(BrandDocument.created_at.desc())
        )
        return result.scalars().all()

    async def get_document(self, db: AsyncSession, document_id: str) -> BrandDocument:
        """Get a specific document"""
        result = await db.execute(
            select(BrandDocument).where(BrandDocument.id == document_id)
        )
        return result.scalar_one_or_none()

    async def delete_document(
        self, db: AsyncSession, document_id: str, brand_id: str
    ) -> bool:
        """Delete a document and its chunks"""
        # Verify document belongs to brand
        document = await self.get_document(db, document_id)
        if not document or document.brand_id != brand_id:
            return False

        # Delete document (chunks will be deleted via cascade)
        await db.execute(delete(BrandDocument).where(BrandDocument.id == document_id))
        await db.commit()
        return True

    async def get_document_chunks(
        self, db: AsyncSession, document_id: str
    ) -> List[DocumentChunk]:
        """Get all chunks for a document"""
        result = await db.execute(
            select(DocumentChunk)
            .where(DocumentChunk.document_id == document_id)
            .order_by(DocumentChunk.chunk_index)
        )
        return result.scalars().all()

    async def get_brand_chunk_count(self, db: AsyncSession, brand_id: str) -> int:
        """Get total number of chunks for a brand"""
        result = await db.execute(
            select(DocumentChunk)
            .join(BrandDocument)
            .where(BrandDocument.brand_id == brand_id)
        )
        return len(result.scalars().all())
