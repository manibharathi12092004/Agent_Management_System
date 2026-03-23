from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application configuration loaded from environment variables.
    """

    # App

    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"


    # Database (Neon PostgreSQL)

    DATABASE_URL: str

    ALEMBIC_DATABASE_URL: str

    # Redis (Celery Broker + Cache)

    REDIS_URL: str


    # Encryption

    ENCRYPTION_KEY: str


    # File Uploads

    UPLOADS_DIR: str = "./uploads"


    # Pydantic Settings Config

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


# Singleton settings instance (cached)
@lru_cache
def get_settings() -> Settings:
    return Settings()


# Global settings object (most convenient)
settings = get_settings()