from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.schemas.campaign import Audience, CampaignCreate, CampaignOut, CampaignUpdate, SchedulePlanItem

POST_COUNT_MAX = 5

# Allowed one-way status transitions (lowercase keys/values).
_STATUS_TRANSITIONS: dict[str, frozenset[str]] = {
    "draft": frozenset({"scheduled", "active", "cancelled"}),
    "scheduled": frozenset({"active", "cancelled"}),
    "active": frozenset({"completed"}),
    # legacy DB rows only — not allowed on create/update by schema
    "paused": frozenset({"active", "completed"}),
    "completed": frozenset({"archived"}),
    "cancelled": frozenset({"archived"}),
    "archived": frozenset(),
}

_CONTENT_FIELDS = frozenset(
    {
        "name",
        "brief",
        "platforms",
        "objective",
        "startDate",
        "endDate",
        "audience",
        "postCount",
        "targetAudience",
        "contentTone",
        "platformInsights",
        "schedulePlan",
    }
)


def _norm_status(s: str | None) -> str:
    return (s or "draft").strip().lower()


def _status_change_allowed(old: str, new: str) -> bool:
    if old == new:
        return True
    allowed = _STATUS_TRANSITIONS.get(old, frozenset())
    return new in allowed


def _audience_to_doc(a: Audience) -> dict[str, Any]:
    return {
        "ageMin": a.ageMin,
        "ageMax": a.ageMax,
    }


def _schedule_to_doc(items: list[SchedulePlanItem]) -> list[dict[str, Any]]:
    return [
        {
            "seq": item.seq,
            "scheduledAt": item.scheduledAt,
            "focus": item.focus.strip(),
            "platforms": list(item.platforms),
        }
        for item in items
    ]


def _doc_to_campaign_out(doc: dict) -> CampaignOut:
    aud = doc.get("audience") or {}
    _pc = int(doc.get("postCount", 1))
    post_count = max(1, min(POST_COUNT_MAX, _pc))
    return CampaignOut(
        id=str(doc["_id"]),
        brandId=str(doc["brand"]),
        createdBy=str(doc["createdBy"]),
        name=doc["name"],
        brief=doc["brief"],
        platforms=list(doc.get("platforms") or []),
        status=_norm_status(doc.get("status")),
        objective=doc.get("objective") or "",
        startDate=doc["startDate"],
        endDate=doc["endDate"],
        audience={
            "ageMin": aud.get("ageMin", 18),
            "ageMax": aud.get("ageMax", 65),
        },
        postCount=post_count,
        targetAudience=doc.get("targetAudience") or "",
        contentTone=doc.get("contentTone") or "",
        platformInsights=doc.get("platformInsights") or {},
        schedulePlan=list(doc.get("schedulePlan") or []),
        createdAt=doc["createdAt"],
        updatedAt=doc["updatedAt"],
    )


async def create_campaign(
    db: AsyncIOMotorDatabase,
    brand_id: str,
    user_id: str,
    body: CampaignCreate,
) -> CampaignOut:
    now = datetime.now(timezone.utc)
    doc = {
        "brand": ObjectId(brand_id),
        "createdBy": ObjectId(user_id),
        "name": body.name.strip(),
        "brief": body.brief.strip(),
        "platforms": body.platforms,
        "status": _norm_status(body.status),
        "objective": (body.objective or "").strip(),
        "startDate": body.startDate,
        "endDate": body.endDate,
        "audience": _audience_to_doc(body.audience),
        "postCount": body.postCount,
        "targetAudience": (body.targetAudience or "").strip(),
        "contentTone": (body.contentTone or "").strip(),
        "platformInsights": body.platformInsights or {},
        "schedulePlan": _schedule_to_doc(body.schedulePlan),
        "createdAt": now,
        "updatedAt": now,
    }
    result = await db.campaigns.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _doc_to_campaign_out(doc)


async def list_campaigns(
    db: AsyncIOMotorDatabase,
    brand_id: str,
    *,
    include_archived: bool = False,
) -> list[CampaignOut]:
    try:
        bid = ObjectId(brand_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid brand id")

    query: dict[str, Any] = {"brand": bid}
    if not include_archived:
        query["status"] = {"$ne": "archived"}

    cursor = db.campaigns.find(query).sort("startDate", -1)
    out: list[CampaignOut] = []
    async for doc in cursor:
        out.append(_doc_to_campaign_out(doc))
    return out


async def get_campaign(db: AsyncIOMotorDatabase, brand_id: str, campaign_id: str) -> CampaignOut:
    try:
        bid = ObjectId(brand_id)
        cid = ObjectId(campaign_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid id")

    doc = await db.campaigns.find_one({"_id": cid, "brand": bid})
    if not doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return _doc_to_campaign_out(doc)


def _update_has_content_fields(body: CampaignUpdate) -> bool:
    return any(
        getattr(body, field) is not None
        for field in _CONTENT_FIELDS
    )


async def update_campaign(
    db: AsyncIOMotorDatabase,
    brand_id: str,
    campaign_id: str,
    body: CampaignUpdate,
) -> CampaignOut:
    try:
        bid = ObjectId(brand_id)
        cid = ObjectId(campaign_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid id")

    existing = await db.campaigns.find_one({"_id": cid, "brand": bid})
    if not existing:
        raise HTTPException(status_code=404, detail="Campaign not found")

    old_status = _norm_status(existing.get("status"))

    if old_status == "archived":
        raise HTTPException(status_code=400, detail="Archived campaigns cannot be modified")

    new_status = _norm_status(body.status) if body.status is not None else old_status

    if new_status != old_status and not _status_change_allowed(old_status, new_status):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status transition from {old_status} to {new_status}",
        )

    has_content = _update_has_content_fields(body)

    if old_status == "active":
        if has_content:
            raise HTTPException(
                status_code=403,
                detail="Active campaigns cannot be edited; only status may move to completed",
            )
        if body.status is not None and new_status not in ("active", "completed"):
            raise HTTPException(
                status_code=400,
                detail="Active campaigns cannot be edited; only status may move to completed",
            )

    if old_status in ("completed", "cancelled"):
        if has_content:
            raise HTTPException(
                status_code=403,
                detail="Only archiving is allowed for completed or cancelled campaigns",
            )
        if body.status is None or new_status != "archived":
            raise HTTPException(
                status_code=400,
                detail="Only status archived is allowed for completed or cancelled campaigns",
            )

    update: dict[str, Any] = {"updatedAt": datetime.now(timezone.utc)}
    if body.name is not None:
        update["name"] = body.name.strip()
    if body.brief is not None:
        update["brief"] = body.brief.strip()
    if body.platforms is not None:
        update["platforms"] = body.platforms
    if body.objective is not None:
        update["objective"] = body.objective.strip()
    if body.startDate is not None:
        update["startDate"] = body.startDate
    if body.endDate is not None:
        update["endDate"] = body.endDate
    if body.audience is not None:
        update["audience"] = _audience_to_doc(body.audience)
    if body.postCount is not None:
        update["postCount"] = body.postCount
    if body.targetAudience is not None:
        update["targetAudience"] = body.targetAudience.strip()
    if body.contentTone is not None:
        update["contentTone"] = body.contentTone.strip()
    if body.platformInsights is not None:
        update["platformInsights"] = body.platformInsights
    if body.schedulePlan is not None:
        update["schedulePlan"] = _schedule_to_doc(body.schedulePlan)
    if body.status is not None:
        update["status"] = new_status

    start = update.get("startDate", existing.get("startDate"))
    end = update.get("endDate", existing.get("endDate"))
    if end < start:
        raise HTTPException(status_code=400, detail="endDate must be on or after startDate")
    post_count = int(update.get("postCount", existing.get("postCount", 1)))
    schedule_plan = update.get("schedulePlan", existing.get("schedulePlan", []))
    if schedule_plan and len(schedule_plan) != post_count:
        raise HTTPException(status_code=400, detail="schedulePlan length must equal postCount")

    await db.campaigns.update_one({"_id": cid, "brand": bid}, {"$set": update})
    doc = await db.campaigns.find_one({"_id": cid})
    assert doc
    return _doc_to_campaign_out(doc)


async def delete_campaign(db: AsyncIOMotorDatabase, brand_id: str, campaign_id: str) -> None:
    """Permanently remove the campaign document from MongoDB (hard delete)."""
    try:
        bid = ObjectId(brand_id)
        cid = ObjectId(campaign_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid id")

    result = await db.campaigns.delete_one({"_id": cid, "brand": bid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
