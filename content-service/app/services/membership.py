from bson import ObjectId
from bson.errors import InvalidId
from motor.motor_asyncio import AsyncIOMotorDatabase


async def assert_brand_member(db: AsyncIOMotorDatabase, user_id: str, brand_id: str) -> None:
    from fastapi import HTTPException

    try:
        bid = ObjectId(brand_id)
        uid = ObjectId(user_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid brand or user id")

    doc = await db.brandmembers.find_one({"brand": bid, "user": uid})
    if not doc:
        raise HTTPException(status_code=403, detail="Not a member of this brand")


async def assert_brand_exists(db: AsyncIOMotorDatabase, brand_id: str) -> None:
    from fastapi import HTTPException

    try:
        bid = ObjectId(brand_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid brand id")

    doc = await db.brands.find_one({"_id": bid})
    if not doc:
        raise HTTPException(status_code=404, detail="Brand not found")
