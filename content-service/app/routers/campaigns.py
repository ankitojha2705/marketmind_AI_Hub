from typing import Annotated

from fastapi import APIRouter, Depends, Query, Response

from app.auth import get_current_user_id
from app.db import get_db
from app.schemas.campaign import CampaignCreate, CampaignOut, CampaignUpdate
from app.services.campaigns import (
    create_campaign,
    delete_campaign,
    get_campaign,
    list_campaigns,
    update_campaign,
)
from app.services.membership import assert_brand_exists, assert_brand_member

router = APIRouter(prefix="/api/brands", tags=["campaigns"])


@router.get("/{brand_id}/campaigns", response_model=list[CampaignOut])
async def route_list_campaigns(
    brand_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
    include_archived: Annotated[bool, Query(description="Include archived campaigns")] = False,
):
    db = get_db()
    await assert_brand_exists(db, brand_id)
    await assert_brand_member(db, user_id, brand_id)
    return await list_campaigns(db, brand_id, include_archived=include_archived)


@router.post("/{brand_id}/campaigns", response_model=CampaignOut, status_code=201)
async def route_create_campaign(
    brand_id: str,
    body: CampaignCreate,
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    db = get_db()
    await assert_brand_exists(db, brand_id)
    await assert_brand_member(db, user_id, brand_id)
    return await create_campaign(db, brand_id, user_id, body)


@router.get("/{brand_id}/campaigns/{campaign_id}", response_model=CampaignOut)
async def route_get_campaign(
    brand_id: str,
    campaign_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    db = get_db()
    await assert_brand_exists(db, brand_id)
    await assert_brand_member(db, user_id, brand_id)
    return await get_campaign(db, brand_id, campaign_id)


@router.patch("/{brand_id}/campaigns/{campaign_id}", response_model=CampaignOut)
async def route_patch_campaign(
    brand_id: str,
    campaign_id: str,
    body: CampaignUpdate,
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    db = get_db()
    await assert_brand_exists(db, brand_id)
    await assert_brand_member(db, user_id, brand_id)
    return await update_campaign(db, brand_id, campaign_id, body)


@router.delete("/{brand_id}/campaigns/{campaign_id}", status_code=204)
async def route_delete_campaign(
    brand_id: str,
    campaign_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    db = get_db()
    await assert_brand_exists(db, brand_id)
    await assert_brand_member(db, user_id, brand_id)
    await delete_campaign(db, brand_id, campaign_id)
    return Response(status_code=204)
