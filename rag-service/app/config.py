from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    # Database
    database_url: str = "postgresql://user:password@localhost:5432/marketmind_rag"

    # OpenAI
    openai_api_key: str = ""

    # CORS — comma-separated in .env (see CORS_ORIGIN_LIST in .env.example); not JSON.
    cors_origins: str = Field(
        default="http://localhost:5173,http://localhost:3000",
        validation_alias="CORS_ORIGIN_LIST",
    )

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

    @property
    def cors_origin_list(self) -> list[str]:
        s = self.cors_origins.strip()
        if s == "*":
            return ["*"]
        if not s:
            return ["http://localhost:5173", "http://localhost:3000"]
        return [o.strip() for o in s.split(",") if o.strip()]


settings = Settings()
