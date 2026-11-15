import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

_backend_dir = Path(__file__).resolve().parent.parent
_root_dir = _backend_dir.parent

class Settings(BaseSettings):
    database_url: str = "sqlite:///./zentriq.db"
    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 480
    cors_origins: str = "http://localhost:5173"
    capacity_limit: int = 8  # tasks per person before the team view warns
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
    resend_api_key: str | None = None
    email_from_address: str = "onboarding@resend.dev"
    email_from_name: str = "Zentriq"
    app_base_url: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=[
            str(_backend_dir / ".env"),
            str(_root_dir / ".env"),
            ".env"
        ],
        extra="ignore"
    )


settings = Settings()
