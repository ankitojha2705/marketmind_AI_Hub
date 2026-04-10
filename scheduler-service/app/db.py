from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongodb_uri)
    return _client


def get_db() -> AsyncIOMotorDatabase:
    return get_client().get_default_database()


async def ensure_indexes() -> None:
    db = get_db()
    await db.posts.create_index([("status", 1), ("scheduledAt", 1)])
    await db.posts.create_index([("campaign", 1), ("status", 1), ("scheduledAt", 1)])
    await db.campaigns.create_index([("status", 1)])
