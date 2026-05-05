from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from openai import OpenAI
import uuid
import asyncio

from ..models.chat import ChatMessage
from ..services.retrieval_service import RetrievalService
from ..services.embedding_service import EmbeddingService
from ..config import settings


class RAGService:
    """Service for RAG-powered chat functionality"""
    
    def __init__(self):
        self.retrieval_service = RetrievalService()
        self.embedding_service = EmbeddingService()
        self.client = OpenAI(api_key=settings.openai_api_key)
    
    async def chat(self, 
                   db: AsyncSession, 
                   brand_id: str, 
                   user_id: str, 
                   message: str, 
                   session_id: str = None,
                   max_chunks: int = None) -> dict:
        """Process a chat message with RAG"""
        
        # Generate session ID if not provided
        if not session_id:
            session_id = str(uuid.uuid4())
        
        # Store user message
        user_chat = ChatMessage(
            brand_id=brand_id,
            user_id=user_id,
            message_type="user",
            content=message,
            session_id=session_id
        )
        db.add(user_chat)
        
        # Retrieve relevant chunks
        max_chunks = max_chunks or settings.max_retrieved_chunks
        similar_chunks = await self.retrieval_service.search_similar_chunks(
            db, brand_id, message, max_chunks
        )
        
        # Build context
        context = self._build_context(similar_chunks)
        
        # Generate response using OpenAI
        response_content = await self._generate_response(message, context)
        
        # Store assistant response
        assistant_chat = ChatMessage(
            brand_id=brand_id,
            user_id=user_id,
            message_type="assistant",
            content=response_content,
            context_chunks=[str(chunk.id) for chunk, _, _ in similar_chunks],
            session_id=session_id
        )
        db.add(assistant_chat)
        
        await db.commit()
        
        # Format response
        sources = self._format_sources(similar_chunks)
        
        return {
            "response": response_content,
            "sources": sources,
            "session_id": session_id
        }
    
    async def get_chat_history(self, 
                               db: AsyncSession, 
                               brand_id: str, 
                               user_id: str, 
                               session_id: str = None,
                               limit: int = 50) -> List[ChatMessage]:
        """Get chat history for a user"""
        query = select(ChatMessage).where(
            ChatMessage.brand_id == brand_id,
            ChatMessage.user_id == user_id
        )
        
        if session_id:
            query = query.where(ChatMessage.session_id == session_id)
        
        query = query.order_by(ChatMessage.created_at.desc()).limit(limit)
        
        result = await db.execute(query)
        messages = result.scalars().all()
        
        # Return in chronological order
        return list(reversed(messages))
    
    def _build_context(self, similar_chunks: List[tuple]) -> str:
        """Build context string from retrieved chunks"""
        if not similar_chunks:
            return "No relevant documents found."

        context_parts = []
        for i, (chunk, similarity, filename) in enumerate(similar_chunks, 1):
            context_parts.append(
                f"[Document {i} - {filename}]:\n{chunk.content}"
            )

        return "\n\n".join(context_parts)
    
    async def _generate_response(self, question: str, context: str) -> str:
        """Generate response using OpenAI with context"""
        system_prompt = """You are a helpful assistant for a marketing platform called MarketMind. 
        Use the provided context to answer questions about brand guidelines, campaign strategies, and marketing content.
        
        Guidelines:
        1. Base your answers primarily on the provided context
        2. If the context doesn't contain relevant information, say so clearly
        3. Always cite your sources using the document numbers
        4. Be helpful, professional, and marketing-focused
        5. If you're unsure about something, ask for clarification
        6. Never make up information that isn't in the context
        
        Context documents are numbered and include the source filename."""
        
        user_prompt = f"""Context:
{context}

Question: {question}

Please provide a helpful answer based on the context above. If the context doesn't contain relevant information, please say so clearly."""
        
        try:
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=1000,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
        
        except Exception as e:
            raise Exception(f"Failed to generate response: {str(e)}")
    
    def _format_sources(self, similar_chunks: List[tuple]) -> List[dict]:
        """Format sources for response"""
        sources = []
        for i, (chunk, similarity, filename) in enumerate(similar_chunks, 1):
            sources.append({
                "chunk_id": str(chunk.id),
                "document_id": str(chunk.document_id),
                "document_filename": filename,
                "chunk_index": chunk.chunk_index,
                "content": chunk.content,
                "similarity_score": similarity
            })
        return sources
    
    async def validate_content(self, 
                              db: AsyncSession, 
                              brand_id: str, 
                              content: str) -> dict:
        """Validate content against brand guidelines"""
        
        # Retrieve relevant guidelines
        guideline_chunks = await self.retrieval_service.search_similar_chunks(
            db, brand_id, "guidelines rules policies brand voice", 10
        )
        
        if not guideline_chunks:
            return {
                "is_valid": True,
                "issues": [],
                "suggestions": [],
                "confidence": 0.5
            }
        
        # Build validation prompt
        context = self._build_context(guideline_chunks)
        
        validation_prompt = f"""Context (brand guidelines and rules):
{context}

Content to validate:
{content}

Please analyze this content against the brand guidelines and provide:
1. Is this content compliant with brand guidelines? (yes/no)
2. What specific issues or concerns do you have?
3. What suggestions would you make to improve it?
4. How confident are you in your assessment? (0-1)

Respond in JSON format:
{{
    "is_valid": true/false,
    "issues": ["issue1", "issue2"],
    "suggestions": ["suggestion1", "suggestion2"],
    "confidence": 0.8
}}"""
        
        try:
            response = await asyncio.to_thread(
                self.client.chat.completions.create,
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a brand compliance expert. Always respond in valid JSON format."},
                    {"role": "user", "content": validation_prompt}
                ],
                max_tokens=500,
                temperature=0.3
            )
            
            import json
            result = json.loads(response.choices[0].message.content.strip())
            
            return {
                "is_valid": result.get("is_valid", True),
                "issues": result.get("issues", []),
                "suggestions": result.get("suggestions", []),
                "confidence": result.get("confidence", 0.5),
                "sources": self._format_sources(guideline_chunks)
            }
        
        except Exception as e:
            # Fallback response if JSON parsing fails
            return {
                "is_valid": True,
                "issues": ["Unable to validate content due to technical issues"],
                "suggestions": ["Please review content manually"],
                "confidence": 0.0
            }
