from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    create_async_engine,
    async_sessionmaker,
)
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


# =========================================================
# SQLAlchemy Base Class (used by all models)
# =========================================================

class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


# =========================================================
# Async Engine (Neon PostgreSQL)
# =========================================================

engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    echo=(settings.APP_ENV == "development"),  # SQL logs in dev only

    # --- Connection Pool Settings (IMPORTANT for Neon) ---
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,   # Avoid stale connections (Neon sleeps idle DBs)
    pool_recycle=1800,    # Recycle connections every 30 min
)


# =========================================================
# Async Session Factory
# =========================================================

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# =========================================================
# Database Initialization (Optional utility)
# =========================================================

async def init_db() -> None:
    """
    Initialize database connection.
    Useful for startup checks or creating tables in dev.
    """
    async with engine.begin() as conn:
        # Import models here if using metadata.create_all()
        # await conn.run_sync(Base.metadata.create_all)
        pass