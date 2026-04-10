from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    mongodb_uri: str

    port: int = 8010
    cors_origins: str = "*"
    batch_size: int = 200

    # If set, callers must provide x-scheduler-token.
    scheduler_token: str = ""

    # Publishing integration (mock-first).
    mock_publish: bool = True
    publisher_api_url: str = ""
    publisher_api_key: str = ""
    publisher_timeout_seconds: float = 10.0

    @property
    def cors_origin_list(self) -> list[str]:
        if self.cors_origins.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
