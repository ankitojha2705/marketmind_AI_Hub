from datetime import datetime, timezone
from typing import Any

from app.config import settings
from app.db import get_db
from app.publisher import publish_post

READY_CAMPAIGN_STATUSES = ["scheduled", "active"]


async def run_scheduler_job(trigger: str = "manual") -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    db = get_db()

    pipeline = [
        {
            "$match": {
                "status": "scheduled",
                "scheduledAt": {"$lte": now},
            }
        },
        {
            "$lookup": {
                "from": "campaigns",
                "localField": "campaign",
                "foreignField": "_id",
                "as": "campaignDoc",
            }
        },
        {"$unwind": "$campaignDoc"},
        {"$match": {"campaignDoc.status": {"$in": READY_CAMPAIGN_STATUSES}}},
        {"$sort": {"scheduledAt": 1, "createdAt": 1}},
        {"$limit": int(settings.batch_size)},
    ]

    due_posts = await db.posts.aggregate(pipeline).to_list(length=settings.batch_size)

    summary = {
        "trigger": trigger,
        "runAt": now.isoformat(),
        "dueFound": len(due_posts),
        "claimed": 0,
        "publishedSuccess": 0,
        "publishedFailed": 0,
        "skipped": 0,
        "processedPostIds": [],
        "failedPostIds": [],
    }

    for post in due_posts:
        post_id = post["_id"]
        # Atomic claim avoids duplicate processing when overlapping invocations run.
        claim = await db.posts.update_one(
            {"_id": post_id, "status": "scheduled"},
            {"$set": {"status": "processing", "updatedAt": now}},
        )
        if claim.modified_count != 1:
            summary["skipped"] += 1
            continue

        summary["claimed"] += 1

        ok, message = await publish_post(post)
        if ok:
            await db.posts.update_one(
                {"_id": post_id},
                {
                    "$set": {
                        "status": "success",
                        "publishedAt": now,
                        "publishMessage": message,
                        "updatedAt": now,
                    },
                    "$unset": {"lastError": ""},
                },
            )
            summary["publishedSuccess"] += 1
            summary["processedPostIds"].append(str(post_id))
        else:
            await db.posts.update_one(
                {"_id": post_id},
                {
                    "$set": {
                        "status": "failed",
                        "lastError": message,
                        "updatedAt": now,
                    }
                },
            )
            summary["publishedFailed"] += 1
            summary["failedPostIds"].append(str(post_id))

    return summary
