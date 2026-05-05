from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://user:password@localhost:5432/marketmind_rag"
    
    # OpenAI
    openai_api_key: str = ""
    
    # CORS
    cors_origin_list: List[str] = ["http://localhost:5173", "http://localhost:3000"]
    
    # File Upload
    max_file_size: int = 10485760  # 10MB
    upload_dir: str = "./uploads"
    
    # Text Processing
    chunk_size: int = 1000
    chunk_overlap: int = 200
    max_retrieved_chunks: int = 5
    
    # API
    port: int = 8003
    debug: bool = True
    
    class Config:
        env_file = ".env"


settings = Settings()
