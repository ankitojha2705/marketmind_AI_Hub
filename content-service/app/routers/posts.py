from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth import get_current_user_id
from app.db import get_db
from app.schemas.post import PostCreate, PostOut, PostUpdate
from app.services.membership import assert_brand_exists, assert_brand_member
from app.services.posts import create_post, list_posts, list_posts_for_brand, update_post

router = APIRouter(prefix="/api/brands", tags=["posts"])


@router.get("/{brand_id}/campaigns/{campaign_id}/posts", response_model=list[PostOut])
async def route_list_posts(
    brand_id: str,
    campaign_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    db = get_db()
    await assert_brand_exists(db, brand_id)
    await assert_brand_member(db, user_id, brand_id)
    return await list_posts(db, brand_id=brand_id, campaign_id=campaign_id)


@router.get("/{brand_id}/posts", response_model=list[PostOut])
async def route_list_posts_for_brand(
    brand_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    db = get_db()
    await assert_brand_exists(db, brand_id)
    await assert_brand_member(db, user_id, brand_id)
    return await list_posts_for_brand(db, brand_id=brand_id)


@router.post("/{brand_id}/campaigns/{campaign_id}/posts", response_model=PostOut, status_code=201)
async def route_create_post(
    brand_id: str,
    campaign_id: str,
    body: PostCreate,
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    db = get_db()
    await assert_brand_exists(db, brand_id)
    await assert_brand_member(db, user_id, brand_id)
    return await create_post(
        db,
        brand_id=brand_id,
        campaign_id=campaign_id,
        user_id=user_id,
        body=body,
    )


@router.patch("/{brand_id}/campaigns/{campaign_id}/posts/{post_id}", response_model=PostOut)
async def route_update_post(
    brand_id: str,
    campaign_id: str,
    post_id: str,
    body: PostUpdate,
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    db = get_db()
    await assert_brand_exists(db, brand_id)
    await assert_brand_member(db, user_id, brand_id)
    return await update_post(
        db,
        brand_id=brand_id,
        campaign_id=campaign_id,
        post_id=post_id,
        user_id=user_id,
        body=body,
    )
