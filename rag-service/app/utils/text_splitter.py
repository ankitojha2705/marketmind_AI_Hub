from typing import List
import re
from ..config import settings


class TextSplitter:
    """Split text into chunks for embedding and retrieval"""
    
    def __init__(self, chunk_size: int = None, chunk_overlap: int = None):
        self.chunk_size = chunk_size or settings.chunk_size
        self.chunk_overlap = chunk_overlap or settings.chunk_overlap
    
    def split_text(self, text: str) -> List[str]:
        """Split text into overlapping chunks"""
        if not text or len(text.strip()) == 0:
            return []
        
        # Clean text
        text = re.sub(r'\s+', ' ', text).strip()
        
        if len(text) <= self.chunk_size:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            # Calculate end position
            end = start + self.chunk_size
            
            if end >= len(text):
                # Last chunk
                chunks.append(text[start:])
                break
            
            # Try to break at sentence boundary
            chunk_text = text[start:end]
            
            # Look for sentence endings near the end
            sentence_end = max(
                chunk_text.rfind('.'),
                chunk_text.rfind('!'),
                chunk_text.rfind('?')
            )
            
            if sentence_end > start + self.chunk_size // 2:
                # Good sentence boundary found
                end = start + sentence_end + 1
                chunks.append(text[start:end])
            else:
                # Look for word boundary
                word_boundary = chunk_text.rfind(' ')
                if word_boundary > start + self.chunk_size // 2:
                    end = start + word_boundary
                    chunks.append(text[start:end])
                else:
                    # Force split
                    chunks.append(text[start:end])
            
            # Calculate next start with overlap
            start = max(start + 1, end - self.chunk_overlap)
        
        return [chunk.strip() for chunk in chunks if chunk.strip()]
    
    def split_with_metadata(self, text: str, document_id: str) -> List[dict]:
        """Split text and include metadata for each chunk"""
        chunks = self.split_text(text)
        
        return [
            {
                "content": chunk,
                "document_id": document_id,
                "chunk_index": i,
                "metadata": {
                    "length": len(chunk),
                    "start_char": sum(len(c) for c in chunks[:i]),
                    "end_char": sum(len(c) for c in chunks[:i+1])
                }
            }
            for i, chunk in enumerate(chunks)
        ]
