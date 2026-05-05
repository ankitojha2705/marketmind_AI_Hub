from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_db
from ..services.document_processor import DocumentProcessor
from ..schemas.document import DocumentUploadResponse, DocumentListResponse, DocumentResponse
from ..config import settings

router = APIRouter(prefix="/api/brands", tags=["knowledge"])

# Initialize services
document_processor = DocumentProcessor()


@router.post("/{brand_id}/knowledge/upload", response_model=DocumentUploadResponse)
async def upload_document(
    brand_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload a document to brand knowledge base"""
    
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Read file content
        file_content = await file.read()
        
        # Process document
        document = await document_processor.process_document(
            db, brand_id, file.filename, file_content
        )
        
        # Get chunk count
        chunk_count = await document_processor.get_document_chunks(db, str(document.id))
        
        return DocumentUploadResponse(
            id=document.id,
            filename=document.filename,
            file_type=document.file_type,
            file_size=document.file_size,
            chunks_created=len(chunk_count),
            message="Document uploaded and processed successfully"
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")


@router.get("/{brand_id}/knowledge/documents", response_model=DocumentListResponse)
async def list_documents(
    brand_id: str,
    db: AsyncSession = Depends(get_db)
):
    """List all documents for a brand"""
    
    try:
        documents = await document_processor.get_brand_documents(db, brand_id)
        
        return DocumentListResponse(
            documents=[DocumentResponse.model_validate(doc) for doc in documents],
            total=len(documents)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list documents: {str(e)}")


@router.get("/{brand_id}/knowledge/documents/{document_id}", response_model=DocumentResponse)
async def get_document(
    brand_id: str,
    document_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific document"""
    
    try:
        document = await document_processor.get_document(db, document_id)
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        if document.brand_id != brand_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return DocumentResponse.model_validate(document)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get document: {str(e)}")


@router.delete("/{brand_id}/knowledge/documents/{document_id}")
async def delete_document(
    brand_id: str,
    document_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Delete a document from brand knowledge base"""
    
    try:
        success = await document_processor.delete_document(db, document_id, brand_id)
        
        if not success:
            raise HTTPException(status_code=404, detail="Document not found or access denied")
        
        return {"message": "Document deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")


@router.get("/{brand_id}/knowledge/stats")
async def get_knowledge_stats(
    brand_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get statistics about brand knowledge base"""
    
    try:
        documents = await document_processor.get_brand_documents(db, brand_id)
        chunk_count = await document_processor.get_brand_chunk_count(db, brand_id)
        
        # Calculate total file size
        total_size = sum(doc.file_size for doc in documents)
        
        # Group by file type
        file_types = {}
        for doc in documents:
            file_types[doc.file_type] = file_types.get(doc.file_type, 0) + 1
        
        return {
            "total_documents": len(documents),
            "total_chunks": chunk_count,
            "total_file_size": total_size,
            "file_types": file_types,
            "last_updated": max((doc.updated_at for doc in documents), default=None)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")
