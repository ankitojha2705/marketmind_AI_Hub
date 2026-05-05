from typing import List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from pgvector.sqlalchemy import Vector
import numpy as np

from ..models.document import DocumentChunk, BrandDocument
from ..services.embedding_service import EmbeddingService
from ..config import settings


class RetrievalService:
    """Service for retrieving relevant document chunks"""
    
    def __init__(self):
        self.embedding_service = EmbeddingService()
    
    async def search_similar_chunks(self,
                                   db: AsyncSession,
                                   brand_id: str,
                                   query: str,
                                   limit: int = None) -> List[Tuple[DocumentChunk, float, str]]:
        """Search for chunks similar to query using vector similarity"""
        limit = limit or settings.max_retrieved_chunks

        # Generate query embedding
        query_embedding = await self.embedding_service.generate_embedding(query)

        # Convert to PostgreSQL array string format
        embedding_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

        # Use raw SQL with named parameters and explicit vector casting
        # Include document filename to avoid relationship loading issues
        sql = text("""
            SELECT dc.id, dc.document_id, dc.chunk_index, dc.content, dc.embedding, dc.created_at, bd.filename,
                   1 - (dc.embedding <=> cast(:embedding as vector)) as similarity
            FROM document_chunks dc
            JOIN brand_documents bd ON bd.id = dc.document_id
            WHERE bd.brand_id = :brand_id
            ORDER BY dc.embedding <=> cast(:embedding as vector)
            LIMIT :limit
        """)

        result = await db.execute(
            sql,
            {"brand_id": brand_id, "embedding": embedding_str, "limit": limit}
        )

        rows = result.fetchall()
        chunks = []
        for row in rows:
            chunk = DocumentChunk(
                id=row[0],
                document_id=row[1],
                chunk_index=row[2],
                content=row[3],
                embedding=row[4],
                created_at=row[5]
            )
            chunks.append((chunk, float(row[7]), row[6]))  # chunk, similarity, filename
        return chunks
    
    async def get_chunks_by_ids(self, 
                                db: AsyncSession, 
                                chunk_ids: List[str]) -> List[DocumentChunk]:
        """Get specific chunks by their IDs"""
        if not chunk_ids:
            return []
        
        result = await db.execute(
            select(DocumentChunk)
            .where(DocumentChunk.id.in_(chunk_ids))
            .order_by(DocumentChunk.chunk_index)
        )
        return result.scalars().all()
    
    async def get_context_for_query(self, 
                                   db: AsyncSession, 
                                   brand_id: str, 
                                   query: str, 
                                   max_context_length: int = 4000) -> str:
        """Get formatted context from relevant chunks"""
        similar_chunks = await self.search_similar_chunks(db, brand_id, query)
        
        if not similar_chunks:
            return ""

        # Format chunks with citations
        context_parts = []
        current_length = 0

        for chunk, similarity, filename in similar_chunks:
            chunk_text = f"[Source: {filename}] {chunk.content}"

            if current_length + len(chunk_text) > max_context_length:
                break

            context_parts.append(chunk_text)
            current_length += len(chunk_text)

        return "\n\n".join(context_parts)
    
    async def hybrid_search(self, 
                           db: AsyncSession, 
                           brand_id: str, 
                           query: str, 
                           limit: int = None) -> List[Tuple[DocumentChunk, float]]:
        """Hybrid search combining vector similarity and keyword matching"""
        limit = limit or settings.max_retrieved_chunks
        
        # Get vector search results
        vector_results = await self.search_similar_chunks(db, brand_id, query, limit * 2)
        
        # Get keyword search results (simple text search)
        keyword_results = await self._keyword_search(db, brand_id, query, limit * 2)
        
        # Combine and re-rank results
        combined_scores = {}
        
        # Add vector search scores
        for chunk, similarity, _ in vector_results:
            combined_scores[str(chunk.id)] = {
                'chunk': chunk,
                'vector_score': similarity,
                'keyword_score': 0.0
            }
        
        # Add keyword search scores
        for chunk, keyword_score in keyword_results:
            chunk_id = str(chunk.id)
            if chunk_id in combined_scores:
                combined_scores[chunk_id]['keyword_score'] = keyword_score
            else:
                combined_scores[chunk_id] = {
                    'chunk': chunk,
                    'vector_score': 0.0,
                    'keyword_score': keyword_score
                }
        
        # Calculate combined scores (weighted average)
        final_results = []
        for chunk_id, scores in combined_scores.items():
            combined_score = (
                0.7 * scores['vector_score'] +  # Weight vector search higher
                0.3 * scores['keyword_score']
            )
            final_results.append((scores['chunk'], combined_score))
        
        # Sort by combined score and return top results
        final_results.sort(key=lambda x: x[1], reverse=True)
        return final_results[:limit]
    
    async def _keyword_search(self, 
                              db: AsyncSession, 
                              brand_id: str, 
                              query: str, 
                              limit: int) -> List[Tuple[DocumentChunk, float]]:
        """Simple keyword-based search"""
        # Split query into keywords
        keywords = [word.lower() for word in query.split() if len(word) > 2]
        
        if not keywords:
            return []
        
        # Build ILIKE query for each keyword
        conditions = []
        for keyword in keywords:
            conditions.append(DocumentChunk.content.ilike(f"%{keyword}%"))
        
        # Combine with OR
        from sqlalchemy import or_
        combined_condition = or_(*conditions)
        
        # Count keyword matches for scoring
        result = await db.execute(
            select(
                DocumentChunk,
                func.sum(
                    func.case(
                        *( (DocumentChunk.content.ilike(f"%{keyword}%"), 1) for keyword in keywords ),
                        else_=0
                    )
                ).label('keyword_matches')
            )
            .join(BrandDocument)
            .where(BrandDocument.brand_id == brand_id)
            .where(combined_condition)
            .group_by(DocumentChunk.id)
            .order_by(func.sum(
                func.case(
                    *( (DocumentChunk.content.ilike(f"%{keyword}%"), 1) for keyword in keywords ),
                    else_=0
                )
            ).desc())
            .limit(limit)
        )
        
        # Normalize scores
        results = []
        for chunk, matches in result:
            score = min(matches / len(keywords), 1.0)  # Normalize to 0-1
            results.append((chunk, score))
        
        return results
