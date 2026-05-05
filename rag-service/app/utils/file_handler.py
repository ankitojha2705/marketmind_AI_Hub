import os
import uuid
from typing import Tuple, Optional
from pathlib import Path
import pypdf
from io import BytesIO


class FileHandler:
    """Handle file operations and text extraction"""
    
    def __init__(self, upload_dir: str = None):
        self.upload_dir = Path(upload_dir or "./uploads")
        self.upload_dir.mkdir(exist_ok=True)
    
    def get_file_type(self, filename: str) -> str:
        """Get file type from filename"""
        ext = Path(filename).suffix.lower()
        type_map = {
            '.pdf': 'pdf',
            '.txt': 'text',
            '.md': 'markdown',
            '.docx': 'docx',
            '.doc': 'doc'
        }
        return type_map.get(ext, 'unknown')
    
    def extract_text_from_pdf(self, file_content: bytes) -> str:
        """Extract text from PDF file"""
        try:
            pdf_file = BytesIO(file_content)
            pdf_reader = pypdf.PdfReader(pdf_file)
            
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            
            return text.strip()
        except Exception as e:
            raise ValueError(f"Failed to extract text from PDF: {str(e)}")
    
    def extract_text_from_text(self, file_content: bytes) -> str:
        """Extract text from plain text file"""
        try:
            # Try UTF-8 first, then fallback to latin-1
            try:
                return file_content.decode('utf-8')
            except UnicodeDecodeError:
                return file_content.decode('latin-1')
        except Exception as e:
            raise ValueError(f"Failed to extract text from text file: {str(e)}")
    
    def extract_text(self, file_content: bytes, file_type: str) -> str:
        """Extract text based on file type"""
        if file_type == 'pdf':
            return self.extract_text_from_pdf(file_content)
        elif file_type in ['text', 'markdown']:
            return self.extract_text_from_text(file_content)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
    
    def save_uploaded_file(self, file_content: bytes, filename: str) -> Tuple[str, int]:
        """Save uploaded file and return path and size"""
        # Generate unique filename
        file_ext = Path(filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = self.upload_dir / unique_filename
        
        # Save file
        with open(file_path, 'wb') as f:
            f.write(file_content)
        
        return str(file_path), len(file_content)
    
    def validate_file(self, filename: str, file_content: bytes, max_size: int) -> None:
        """Validate file before processing"""
        # Check file size
        if len(file_content) > max_size:
            raise ValueError(f"File size exceeds maximum allowed size of {max_size} bytes")
        
        # Check file type
        file_type = self.get_file_type(filename)
        if file_type == 'unknown':
            raise ValueError("Unsupported file type")
        
        # Check if file is not empty
        if len(file_content) == 0:
            raise ValueError("File is empty")
    
    def process_file(self, file_content: bytes, filename: str, max_size: int) -> Tuple[str, str, int, str]:
        """
        Process uploaded file
        Returns: (file_path, file_type, file_size, extracted_text)
        """
        # Validate file
        self.validate_file(filename, file_content, max_size)
        
        # Get file type
        file_type = self.get_file_type(filename)
        
        # Save file
        file_path, file_size = self.save_uploaded_file(file_content, filename)
        
        # Extract text
        text = self.extract_text(file_content, file_type)
        
        if not text.strip():
            raise ValueError("No text could be extracted from the file")
        
        return file_path, file_type, file_size, text
