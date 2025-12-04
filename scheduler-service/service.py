import logging
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_, or_
from models import Schedule, ScheduleStatus, Post, Brand, Campaign, Platform
import uuid
import pytz
from naive_scheduler import schedule_posts

logger = logging.getLogger(__name__)


class SchedulerConfig:
    """Configuration for schedule processing."""
    MAX_RETRY_COUNT = 3


@dataclass
class TriggerScheduleResponse:
    schedule_id: str
    status: str
    retry_count: int
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

def mock_platform_api_call(platform: Platform, post_data: dict[str, Any]) -> dict[str, Any]:
    """
    Mock external platform API call for publishing content.
    """
    logger.info(
        "Mock platform API call for %s (post_id=%s)",
        platform.value,
        post_data.get("post_id")
    )
    return {
        "status": ScheduleStatus.SUCCESS,
        "details": f"Post scheduled on {platform.value}"
    }


class ScheduleService:
    """Service layer for schedule business logic"""

    @staticmethod
    async def update_post_schedule(
        db: AsyncSession,
        post_id: str,
        timestamp: str,
        timezone: str | None = None
    ) -> Schedule:
        """
        Update the most recent schedule for a post with a new publish time.
        """
        post_uuid = uuid.UUID(post_id)

        post_result = await db.execute(
            select(Post).where(Post.post_id == post_uuid)
        )
        post = post_result.scalar_one_or_none()

        if post is None:
            raise ValueError(f"Post with id {post_id} not found")

        if timezone is None:
            brand_result = await db.execute(
                select(Brand).where(Brand.brand_id == post.brand_id)
            )
            brand = brand_result.scalar_one_or_none()

            if brand is None:
                raise ValueError(f"Brand with id {post.brand_id} not found")

            timezone = brand.brand_default_timezone

        try:
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            if dt.tzinfo is not None:
                dt = dt.replace(tzinfo=None)
        except ValueError:
            dt = datetime.fromisoformat(timestamp)

        tz = pytz.timezone(timezone)
        dt = tz.localize(dt)
        publish_time_utc = dt.astimezone(pytz.UTC)

        schedule_result = await db.execute(
            select(Schedule)
            .where(Schedule.post_id == post_uuid)
            .order_by(desc(Schedule.publish_time))
            .limit(1)
        )
        schedule = schedule_result.scalar_one_or_none()

        if schedule is None:
            raise ValueError(f"No schedule found for post {post_id}")

        schedule.publish_time = publish_time_utc
        schedule.status = ScheduleStatus.PENDING
        schedule.retry_count = 0

        await db.commit()
        await db.refresh(schedule)

        return schedule

    @staticmethod
    async def create_campaign_schedule(
        db: AsyncSession,
        campaign_id: str
    ) -> list[Schedule]:
        """
        Create schedules for all posts in a campaign with smart scheduling
        
        Args:
            db: Database session
            campaign_id: The campaign identifier (UUID string)
        
        Returns:
            List of Schedule objects created for the campaign
        """
        # Convert campaign_id string to UUID
        campaign_uuid = uuid.UUID(campaign_id)
        
        # Fetch campaign info
        campaign_result = await db.execute(
            select(Campaign).where(Campaign.campaign_id == campaign_uuid)
        )
        campaign = campaign_result.scalar_one_or_none()
        
        if campaign is None:
            raise ValueError(f"Campaign with id {campaign_id} not found")
        
        # Fetch brand to get default timezone
        brand_result = await db.execute(
            select(Brand).where(Brand.brand_id == campaign.brand_id)
        )
        brand = brand_result.scalar_one_or_none()
        
        if brand is None:
            raise ValueError(f"Brand with id {campaign.brand_id} not found")
        
        # Get brand default timezone
        brand_timezone = brand.brand_default_timezone
        
        # Fetch posts for this campaign (hardcoded to TWITTER for now)
        posts_result = await db.execute(
            select(Post).where(
                Post.campaign_id == campaign_uuid,
                Post.platform == Platform.TWITTER
            )
        )
        posts = posts_result.scalars().all()
        
        if not posts:
            raise ValueError(f"No TWITTER posts found for campaign {campaign_id}")

        num_posts = len(posts)
        
        if num_posts == 0:
            raise ValueError(f"No posts to schedule for campaign {campaign_id}")
        
        # TODO: Replace naive_scheduler with agentic_scheduler for LLM-based intelligent scheduling
        # Generate publish times using naive scheduler (all at 7 PM)
        publish_times_utc = schedule_posts(
            num_posts=num_posts,
            start_date=campaign.start_date,
            end_date=campaign.end_date,
            timezone=brand_timezone
        )
        
        # Create schedules
        schedules = []
        for i, post in enumerate(posts):
            # Generate UUID for schedule_id
            schedule_id = uuid.uuid4()
            
            # Create schedule record
            schedule = Schedule(
                schedule_id=schedule_id,
                post_id=post.post_id,
                publish_time=publish_times_utc[i],
                status=ScheduleStatus.PENDING,
                retry_count=0
            )
            
            schedules.append(schedule)
            db.add(schedule)
        
        # Save all schedules to database
        await db.commit()
        
        # Refresh all schedules
        for schedule in schedules:
            await db.refresh(schedule)
        
        return schedules

    @staticmethod
    async def get_campaign_schedules(
        db: AsyncSession,
        campaign_id: str
    ) -> list[Schedule]:
        """
        Get all schedules for a campaign
        
        Args:
            db: Database session
            campaign_id: The campaign identifier (UUID string)
        
        Returns:
            List of Schedule objects for the campaign
        """
        campaign_uuid = uuid.UUID(campaign_id)
        
        # Fetch all posts for this campaign
        posts_result = await db.execute(
            select(Post).where(Post.campaign_id == campaign_uuid)
        )
        posts = posts_result.scalars().all()
        
        if not posts:
            raise ValueError(f"No posts found for campaign {campaign_id}")
        
        post_ids = [post.post_id for post in posts]
        
        # Fetch all schedules for these posts
        schedules_result = await db.execute(
            select(Schedule).where(Schedule.post_id.in_(post_ids))
        )
        schedules = schedules_result.scalars().all()
        
        return schedules

    @staticmethod
    async def get_post_schedule(
        db: AsyncSession,
        post_id: str
    ) -> Schedule:
        """
        Get the schedule for a post (returns the most recent schedule)
        
        Args:
            db: Database session
            post_id: The post identifier (UUID string)
        
        Returns:
            Schedule object for the post (most recent)
        """
        post_uuid = uuid.UUID(post_id)
        
        # Verify post exists
        post_result = await db.execute(
            select(Post).where(Post.post_id == post_uuid)
        )
        post = post_result.scalar_one_or_none()
        
        if post is None:
            raise ValueError(f"Post with id {post_id} not found")
        
        # Fetch the most recent schedule for this post (ordered by publish_time desc)
        schedule_result = await db.execute(
            select(Schedule)
            .where(Schedule.post_id == post_uuid)
            .order_by(desc(Schedule.publish_time))
            .limit(1)
        )
        schedule = schedule_result.scalar_one_or_none()
        
        if schedule is None:
            raise ValueError(f"No schedule found for post {post_id}")
        
        return schedule

    @staticmethod
    async def trigger_schedule(
        db: AsyncSession
    ) -> list[TriggerScheduleResponse]:
        """
        Trigger processing for schedules that are ready.
        """
        schedules_to_process = await ScheduleService.fetch_schedules_to_process(db)
        
        if not schedules_to_process:
            logger.info("No schedules ready for processing")
            return []
        
        results: list[TriggerScheduleResponse] = []
        for schedule in schedules_to_process:
            results.append(await ScheduleService.process_schedule(db, schedule))
        
        return results

    @staticmethod
    async def fetch_schedules_to_process(
        db: AsyncSession
    ) -> list[Schedule]:
        """
        Fetch schedules ready for processing.

        Includes:
            1. PENDING schedules whose publish_time is now or in the past (UTC)
            2. FAILED schedules whose retry_count is below the max retry threshold
        """
        now = datetime.now(pytz.UTC)
        
        schedules_result = await db.execute(
            select(Schedule).where(
                or_(
                    and_(
                        Schedule.status == ScheduleStatus.PENDING,
                        Schedule.publish_time <= now
                    ),
                    and_(
                        Schedule.status == ScheduleStatus.FAILED,
                        Schedule.retry_count < SchedulerConfig.MAX_RETRY_COUNT
                    )
                )
            )
        )
        schedules = schedules_result.scalars().all()
        logger.info("Found %d schedules to process", len(schedules))
        return schedules

    
    @staticmethod
    async def process_schedule(
        db: AsyncSession,
        schedule: Schedule
    ) -> TriggerScheduleResponse:
        """
        Process a single schedule by publishing the associated post.
        """
        try:
            post_result = await db.execute(
                select(Post).where(Post.post_id == schedule.post_id)
            )
            post = post_result.scalar_one_or_none()
            
            if post is None:
                logger.error(
                    "Post not found for schedule %s",
                    schedule.schedule_id
                )
                schedule.status = ScheduleStatus.FAILED
                schedule.retry_count += 1
                await db.commit()
                return TriggerScheduleResponse(
                    schedule_id=str(schedule.schedule_id),
                    status=ScheduleStatus.FAILED.value,
                    retry_count=schedule.retry_count,
                    error="Post not found"
                )
            
            logger.info(
                "Processing schedule %s for post %s on %s",
                schedule.schedule_id,
                post.title,
                post.platform.value
            )
            
            post_data = {
                "post_id": str(post.post_id),
                "title": post.title,
                "s3_url": post.s3_url,
                "platform": post.platform.value
            }
            
            api_response = mock_platform_api_call(post.platform, post_data)
            
            if api_response["status"] == ScheduleStatus.SUCCESS:
                schedule.status = ScheduleStatus.SUCCESS
                logger.info(
                    "Schedule %s marked as SUCCESS",
                    schedule.schedule_id
                )
            else:
                schedule.status = ScheduleStatus.FAILED
                schedule.retry_count += 1
                logger.warning(
                    "Schedule %s failed, retry_count=%d",
                    schedule.schedule_id,
                    schedule.retry_count
                )
            
            await db.commit()
            
            return TriggerScheduleResponse(
                schedule_id=str(schedule.schedule_id),
                status=schedule.status.value,
                retry_count=schedule.retry_count
            )
        except Exception as exc:
            logger.error(
                "Error processing schedule %s: %s",
                schedule.schedule_id,
                exc,
                exc_info=True
            )
            await db.rollback()
            schedule.status = ScheduleStatus.FAILED
            schedule.retry_count += 1
            db.add(schedule)
            await db.commit()
            
            return TriggerScheduleResponse(
                schedule_id=str(schedule.schedule_id),
                status=ScheduleStatus.FAILED.value,
                retry_count=schedule.retry_count,
                error=str(exc)
            )