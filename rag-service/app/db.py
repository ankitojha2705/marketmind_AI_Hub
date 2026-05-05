from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from pgvector.sqlalchemy import Vector
import asyncpg
from .config import settings


class Base(DeclarativeBase):
    pass


# Create async engine
engine = create_async_engine(
    settings.database_url.replace("postgresql://", "postgresql+asyncpg://"),
    echo=settings.debug,
    future=True
)

# Create session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


async def get_db() -> AsyncSession:
    """Dependency to get database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def ensure_vector_extension():
    """Ensure pgvector extension is enabled"""
    conn = await asyncpg.connect(settings.database_url)
    try:
        await conn.execute('CREATE EXTENSION IF NOT EXISTS vector')
    finally:
        await conn.close()


async def ensure_indexes():
    """Create necessary database indexes"""
    await ensure_vector_extension()
    
    # Indexes will be created via Alembic migrations
    pass
