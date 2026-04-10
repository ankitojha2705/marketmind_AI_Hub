from motor.motor_asyncio import AsyncIOMotorClient

from app.config import settings

_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongodb_uri)
    return _client


def get_db():
    return get_client().get_default_database()


async def ensure_indexes():
    db = get_db()
    await db.campaigns.create_index([("brand", 1), ("createdAt", -1)])
    await db.campaigns.create_index([("brand", 1), ("_id", 1)])
    await db.posts.create_index([("campaign", 1), ("scheduleSeq", 1), ("platform", 1)], unique=True)
    await db.posts.create_index([("brand", 1), ("campaign", 1), ("createdAt", -1)])
