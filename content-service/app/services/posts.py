from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.post import PostCreate, PostOut, PostUpdate


def _to_obj_id(raw: str, *, detail: str) -> ObjectId:
    try:
        return ObjectId(raw)
    except InvalidId:
        raise HTTPException(status_code=400, detail=detail)


def _post_doc_to_out(doc: dict[str, Any]) -> PostOut:
    return PostOut(
        id=str(doc["_id"]),
        brandId=str(doc["brand"]),
        campaignId=str(doc["campaign"]),
        createdBy=str(doc["createdBy"]),
        updatedBy=str(doc["updatedBy"]),
        scheduleSeq=int(doc.get("scheduleSeq", 1)),
        platform=doc.get("platform") or "",
        scheduledAt=doc["scheduledAt"],
        focus=doc.get("focus") or "",
        caption=doc.get("caption") or "",
        hashtags=list(doc.get("hashtags") or []),
        selectedHashtags=list(doc.get("selectedHashtags") or []),
        postType=doc.get("postType") or "",
        callToAction=doc.get("callToAction") or "",
        seo=doc.get("seo") or {},
        media=doc.get("media") or {},
        createdAt=doc["createdAt"],
        updatedAt=doc["updatedAt"],
    )


async def _assert_campaign_in_brand(
    db: AsyncIOMotorDatabase,
    brand_oid: ObjectId,
    campaign_oid: ObjectId,
) -> None:
    campaign = await db.campaigns.find_one({"_id": campaign_oid, "brand": brand_oid}, {"_id": 1})
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")


async def create_post(
    db: AsyncIOMotorDatabase,
    *,
    brand_id: str,
    campaign_id: str,
    user_id: str,
    body: PostCreate,
) -> PostOut:
    brand_oid = _to_obj_id(brand_id, detail="Invalid brand id")
    campaign_oid = _to_obj_id(campaign_id, detail="Invalid campaign id")
    user_oid = _to_obj_id(user_id, detail="Invalid user id")
    await _assert_campaign_in_brand(db, brand_oid, campaign_oid)

    exists = await db.posts.find_one(
        {
            "brand": brand_oid,
            "campaign": campaign_oid,
            "platform": body.platform.strip().lower(),
            "scheduleSeq": body.scheduleSeq,
        },
        {"_id": 1},
    )
    if exists:
        raise HTTPException(status_code=409, detail="Post already exists for this schedule sequence and platform")

    now = datetime.now(timezone.utc)
    doc = {
        "brand": brand_oid,
        "campaign": campaign_oid,
        "createdBy": user_oid,
        "updatedBy": user_oid,
        "scheduleSeq": body.scheduleSeq,
        "platform": body.platform.strip().lower(),
        "scheduledAt": body.scheduledAt,
        "focus": body.focus.strip(),
        "caption": body.caption.strip(),
        "hashtags": list(body.hashtags),
        "selectedHashtags": list(body.selectedHashtags),
        "postType": (body.postType or "").strip(),
        "callToAction": (body.callToAction or "").strip(),
        "seo": body.seo or {},
        "media": body.media or {},
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.posts.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _post_doc_to_out(doc)


async def list_posts(
    db: AsyncIOMotorDatabase,
    *,
    brand_id: str,
    campaign_id: str,
) -> list[PostOut]:
    brand_oid = _to_obj_id(brand_id, detail="Invalid brand id")
    campaign_oid = _to_obj_id(campaign_id, detail="Invalid campaign id")
    await _assert_campaign_in_brand(db, brand_oid, campaign_oid)
    cursor = db.posts.find({"brand": brand_oid, "campaign": campaign_oid}).sort([("scheduleSeq", 1), ("platform", 1)])
    out: list[PostOut] = []
    async for doc in cursor:
        out.append(_post_doc_to_out(doc))
    return out


async def list_posts_for_brand(
    db: AsyncIOMotorDatabase,
    *,
    brand_id: str,
) -> list[PostOut]:
    brand_oid = _to_obj_id(brand_id, detail="Invalid brand id")
    cursor = db.posts.find({"brand": brand_oid}).sort([("scheduledAt", 1), ("createdAt", -1)])
    out: list[PostOut] = []
    async for doc in cursor:
        out.append(_post_doc_to_out(doc))
    return out


async def update_post(
    db: AsyncIOMotorDatabase,
    *,
    brand_id: str,
    campaign_id: str,
    post_id: str,
    user_id: str,
    body: PostUpdate,
) -> PostOut:
    brand_oid = _to_obj_id(brand_id, detail="Invalid brand id")
    campaign_oid = _to_obj_id(campaign_id, detail="Invalid campaign id")
    post_oid = _to_obj_id(post_id, detail="Invalid post id")
    user_oid = _to_obj_id(user_id, detail="Invalid user id")
    await _assert_campaign_in_brand(db, brand_oid, campaign_oid)

    existing = await db.posts.find_one({"_id": post_oid, "brand": brand_oid, "campaign": campaign_oid})
    if not existing:
        raise HTTPException(status_code=404, detail="Post not found")

    update: dict[str, Any] = {
        "updatedAt": datetime.now(timezone.utc),
        "updatedBy": user_oid,
    }
    if body.scheduledAt is not None:
        update["scheduledAt"] = body.scheduledAt
    if body.focus is not None:
        update["focus"] = body.focus.strip()
    if body.caption is not None:
        update["caption"] = body.caption.strip()
    if body.hashtags is not None:
        update["hashtags"] = list(body.hashtags)
    if body.selectedHashtags is not None:
        update["selectedHashtags"] = list(body.selectedHashtags)
    if body.postType is not None:
        update["postType"] = body.postType.strip()
    if body.callToAction is not None:
        update["callToAction"] = body.callToAction.strip()
    if body.seo is not None:
        update["seo"] = body.seo
    if body.media is not None:
        update["media"] = body.media

    await db.posts.update_one({"_id": post_oid, "brand": brand_oid, "campaign": campaign_oid}, {"$set": update})
    doc = await db.posts.find_one({"_id": post_oid})
    assert doc
    return _post_doc_to_out(doc)
