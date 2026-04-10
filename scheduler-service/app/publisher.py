from typing import Any

import httpx

from app.config import settings


async def publish_post(post: dict[str, Any]) -> tuple[bool, str]:
    """
    Publish a post via external publisher API.
    Returns (ok, message). Defaults to mocked success.
    """
    if settings.mock_publish or not settings.publisher_api_url:
        return True, "mock-success"

    payload = {
        "postId": str(post.get("_id")),
        "brandId": str(post.get("brand")),
        "campaignId": str(post.get("campaign")),
        "platform": post.get("platform"),
        "caption": post.get("caption"),
        "hashtags": post.get("selectedHashtags") or post.get("hashtags") or [],
        "scheduledAt": post.get("scheduledAt").isoformat() if post.get("scheduledAt") else None,
        "media": post.get("media") or {},
    }

    headers = {"Content-Type": "application/json"}
    if settings.publisher_api_key:
        headers["Authorization"] = f"Bearer {settings.publisher_api_key}"

    async with httpx.AsyncClient(timeout=settings.publisher_timeout_seconds) as client:
        resp = await client.post(settings.publisher_api_url, json=payload, headers=headers)
        if 200 <= resp.status_code < 300:
            return True, f"http-{resp.status_code}"
        return False, f"http-{resp.status_code}: {resp.text[:500]}"
