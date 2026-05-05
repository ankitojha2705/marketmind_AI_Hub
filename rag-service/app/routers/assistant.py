from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from ..services.rag_service import RAGService
from ..schemas.chat import ChatRequest, ChatResponse, ChatHistoryResponse
from ..models.chat import ChatMessage

router = APIRouter(prefix="/api/brands", tags=["assistant"])

# Initialize services
rag_service = RAGService()


@router.post("/{brand_id}/assistant/chat", response_model=ChatResponse)
async def chat_with_assistant(
    brand_id: str, request: ChatRequest, db: AsyncSession = Depends(get_db)
):
    """Chat with RAG assistant"""

    try:
        # TODO: Add user authentication - get user_id from request
        user_id = "temp_user_id"  # Replace with actual user authentication

        response = await rag_service.chat(
            db=db,
            brand_id=brand_id,
            user_id=user_id,
            message=request.message,
            session_id=request.session_id,
            max_chunks=request.max_chunks,
        )

        return ChatResponse(**response)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@router.get("/{brand_id}/assistant/history")
async def get_chat_history(
    brand_id: str,
    session_id: Optional[str] = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """Get chat history"""

    try:
        # TODO: Add user authentication - get user_id from request
        user_id = "temp_user_id"  # Replace with actual user authentication

        messages = await rag_service.get_chat_history(
            db=db,
            brand_id=brand_id,
            user_id=user_id,
            session_id=session_id,
            limit=limit,
        )

        return ChatHistoryResponse(
            messages=messages, session_id=session_id or "default"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get chat history: {str(e)}"
        )


@router.post("/{brand_id}/assistant/validate")
async def validate_content(
    brand_id: str, content: dict, db: AsyncSession = Depends(get_db)
):
    """Validate content against brand guidelines"""

    try:
        if "content" not in content:
            raise HTTPException(status_code=400, detail="Content is required")

        validation_result = await rag_service.validate_content(
            db=db, brand_id=brand_id, content=content["content"]
        )

        return validation_result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")


@router.get("/{brand_id}/assistant/suggestions")
async def get_content_suggestions(
    brand_id: str, context: Optional[str] = None, db: AsyncSession = Depends(get_db)
):
    """Get content suggestions based on brand knowledge"""

    try:
        # Default suggestions based on common marketing queries
        suggestions = [
            "What tone should we use for our brand voice?",
            "What are our brand guidelines for promotions?",
            "What products/services do we offer?",
            "What's our target audience profile?",
            "What platforms do we focus on?",
        ]

        # If context provided, generate more specific suggestions
        if context:
            # TODO: Implement context-aware suggestions
            pass

        return {"suggestions": suggestions, "context": context}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get suggestions: {str(e)}"
        )


@router.delete("/{brand_id}/assistant/history")
async def clear_chat_history(
    brand_id: str, session_id: Optional[str] = None, db: AsyncSession = Depends(get_db)
):
    """Clear chat history"""

    try:
        # TODO: Add user authentication - get user_id from request
        user_id = "temp_user_id"  # Replace with actual user authentication

        # Delete chat messages
        from sqlalchemy import delete

        delete_query = delete(ChatMessage).where(
            ChatMessage.brand_id == brand_id, ChatMessage.user_id == user_id
        )

        if session_id:
            delete_query = delete_query.where(ChatMessage.session_id == session_id)

        await db.execute(delete_query)
        await db.commit()

        return {"message": "Chat history cleared successfully"}

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to clear chat history: {str(e)}"
        )
