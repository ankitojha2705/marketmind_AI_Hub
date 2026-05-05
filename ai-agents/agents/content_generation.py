"""
Content Generation Agent: Produces platform-native campaign posts (Instagram, Reddit, etc.)
using analysis insights.
"""
from crewai import Agent, Task
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import List, Optional, Dict, Any
import json
import os
import logging
from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4

import requests

logger = logging.getLogger(__name__)
GENERATED_IMAGES_DIR = Path(__file__).resolve().parents[1] / "generated-images"


class GeneratedPost(BaseModel):
    schedule_seq: int = Field(description="1-based schedule sequence id")
    platform: str = Field(description="Target platform")
    scheduled_at: str = Field(description="Planned publish datetime ISO string")
    focus: str = Field(description="Content focus for this post")
    caption: str = Field(description="Primary post body: Instagram caption, or Reddit self-post body text")
    hashtags: List[str] = Field(default_factory=list, description="Relevant hashtags for this post")
    post_type: str = Field(
        default="",
        description=(
            "Recommended format: for Instagram use Reel | Story | Carousel | Photo; "
            "for Reddit use Text Post | Image Post | Link Post"
        ),
    )
    call_to_action: str = Field(default="", description="Call to action")
    media_prompts: List[str] = Field(default_factory=list, description="Media prompts for this post")
    image_prompt: Optional[str] = Field(default=None, description="Image prompt for generation")
    image_url: Optional[str] = Field(default=None, description="Generated image URL")
    notes: Optional[str] = Field(default=None, description="Optional notes")
    reddit_title: Optional[str] = Field(
        default=None,
        description="Reddit only: concise title for the post (required when platform is reddit)",
    )

    @field_validator("post_type", "call_to_action", mode="before")
    @classmethod
    def coerce_null_str(cls, v: Any) -> Any:
        if v is None:
            return ""
        return v

    @model_validator(mode="after")
    def backfill_hashtags_from_caption(self):
        # LLMs sometimes omit post_type / call_to_action; normalize before other backfills.
        plat = (self.platform or "").lower().strip()
        if not (self.post_type or "").strip():
            self.post_type = "Text Post" if plat == "reddit" else "Photo"
        # Some model outputs omit hashtags array; recover from caption tags when possible.
        if self.hashtags:
            return self
        if not self.caption:
            return self
        extracted = []
        seen = set()
        for token in self.caption.replace("\n", " ").split():
            if not token.startswith("#"):
                continue
            tag = token.strip(".,!?;:()[]{}\"'`")
            if len(tag) <= 1:
                continue
            norm = tag.lower()
            if norm in seen:
                continue
            seen.add(norm)
            extracted.append(tag)
        self.hashtags = extracted
        return self


class ContentOutput(BaseModel):
    posts: List[GeneratedPost] = Field(default_factory=list, description="Generated posts")


def _dedupe_preserve_order(items: List[str]) -> List[str]:
    seen = set()
    out: List[str] = []
    for x in items:
        k = str(x).strip().lower()
        if not k or k in seen:
            continue
        seen.add(k)
        out.append(k)
    return out


def expand_schedule_targets(schedule_plan: Any) -> List[Dict[str, Any]]:
    """
    One generated post per (schedule row × platform). Order matches schedule_plan iteration,
    then platforms order within each row.
    """
    rows = schedule_plan if isinstance(schedule_plan, list) else []
    out: List[Dict[str, Any]] = []
    for idx, entry in enumerate(rows):
        if not isinstance(entry, dict):
            continue
        seq = int(entry.get("seq", idx + 1))
        scheduled_at = str(entry.get("scheduled_at") or entry.get("scheduledAt") or "")
        focus = str(entry.get("focus") or "")
        raw_plats = entry.get("platforms") or ["instagram"]
        plats = _dedupe_preserve_order([str(p) for p in raw_plats])
        if not plats:
            plats = ["instagram"]
        for plat in plats:
            out.append(
                {
                    "schedule_seq": seq,
                    "scheduled_at": scheduled_at,
                    "focus": focus,
                    "platform": plat,
                }
            )
    return out


def _platform_playbook(platforms_needed: List[str]) -> str:
    blocks = []
    if "reddit" in platforms_needed:
        blocks.append(
            """
        REDDIT (when platform is "reddit"):
        - Set reddit_title: a specific, human title (not clickbait; under 300 characters). No title-only promotional spam.
        - caption: the post body (selftext). Use short paragraphs, authentic voice, value-first. Optional bullet lists OK.
        - Do NOT use Instagram-style hashtag blocks. hashtags must be [] or at most 2 niche tags if truly useful.
        - In notes: suggest 2-4 plausible subreddit names (e.g. r/food, r/cityname) and one line on tone/rules to respect.
        - post_type: Text Post | Image Post | Link Post. Prefer Text Post unless an image clearly helps.
        - Avoid "As a brand we...", astroturfing, or excessive emojis. Reddit rewards honesty and context.
        - call_to_action: subtle (e.g. "happy to answer questions") — not a hard sales pitch.
        - image_prompt: omit or null for text-only posts; for Image Post, describe a natural photo with NO readable text in-frame.
            """
        )
    if any(p in platforms_needed for p in ("instagram", "facebook", "linkedin", "twitter")):
        blocks.append(
            """
        INSTAGRAM / VISUAL FEEDS (when platform is "instagram" or similar):
        - caption: scroll-stopping hook, concise body, line breaks for readability.
        - hashtags: 10-15 relevant, non-spammy tags with # prefix.
        - post_type: Reel | Story | Carousel | Photo as appropriate.
        - image_prompt: required for visual posts; NO readable text, logos, or signage in the scene.
            """
        )
    if "telegram" in platforms_needed:
        blocks.append(
            """
        TELEGRAM (when platform is "telegram"):
        - caption: clear message; can be slightly longer; use line breaks; minimal hashtags (0-3).
        - post_type: use "Channel Post" or "Group Post".
            """
        )
    if not blocks:
        blocks.append(
            "- Default: concise caption, sensible hashtags, clear CTA, image_prompt without text in-frame."
        )
    return "\n".join(blocks)


class ContentAgentConfig:
    """Configuration and creation of the Content Generation Agent"""

    @staticmethod
    def create_agent(llm: ChatOpenAI) -> Agent:
        return Agent(
            role="Multi-Platform Social Content Strategist",
            goal=(
                "Generate high-performing, platform-native posts that align with audience insights "
                "and campaign goals—especially Reddit and Instagram—for food & beverage SMBs."
            ),
            backstory=(
                "You are a seasoned social media strategist for food & beverage SMBs. "
                "You know Instagram's visual and hashtag norms AND Reddit's community norms "
                "(titles, selftext, authenticity, no hashtag spam). You adapt tone and structure "
                "per platform while keeping the brand honest and distinctive."
            ),
            verbose=True,
            allow_delegation=False,
            llm=llm,
        )

    @staticmethod
    def create_task(
        agent: Agent,
        business_type: str,
        campaign_goals: str,
        analysis: Dict,
        target_posts: List[Dict[str, Any]],
        platforms_needed: List[str],
    ) -> Task:
        """Create the generation task informed by analysis and competitor data."""
        target_audience = analysis.get("target_audience", "local audience")
        content_tone = analysis.get("content_tone", "friendly")
        competitor_themes = analysis.get("competitor_themes", [])
        competitor_hashtags = analysis.get("competitor_hashtags", [])
        market_position = analysis.get("market_positioning", "")
        price_point = analysis.get("suggested_price_point", "")
        playbook = _platform_playbook(platforms_needed)

        task_description = f"""
        Using the insights below, generate one post per TARGET_POSTS row (same count, same order).

        Business Type: {business_type}
        Campaign Goal: {campaign_goals}

        Audience Insight: {target_audience}
        Recommended Tone: {content_tone}

        TARGET_POSTS (generate exactly len(TARGET_POSTS) items in this order; match schedule_seq, scheduled_at, focus, platform each row):
        {json.dumps(target_posts)}

        Market Context:
        - Competitor Themes: {', '.join(competitor_themes) if competitor_themes else 'Not available'}
        - Market Position: {market_position}
        - Price Point: {price_point}

        Platform-specific rules:
        {playbook}

        General requirements:
        - For each row, set platform exactly as given; do not merge platforms into one post.
        - Include clear call_to_action aligned with the goal (adjusted for platform norms).
        - Suggest 2-4 media_prompts when visuals help; they must describe scenes with NO readable text.
        - Avoid ALL caps walls and excessive emojis unless platform playbook says otherwise.
        - Position content uniquely against competitors while staying authentic.

        Return a JSON object matching this schema exactly:
        {{
          "posts": [
            {{
              "schedule_seq": 1,
              "platform": "instagram",
              "scheduled_at": "2026-01-15T18:00:00Z",
              "focus": "post focus",
              "caption": "string",
              "hashtags": ["#tag1", "#tag2"],
              "post_type": "Reel|Story|Carousel|Photo|Text Post|Image Post|Link Post|Channel Post|Group Post",
              "call_to_action": "string",
              "media_prompts": ["prompt1", "prompt2"],
              "image_prompt": "detailed description for DALL-E image generation or null",
              "reddit_title": "only for reddit — concise title string",
              "notes": "optional string"
            }}
          ]
        }}
        """

        return Task(
            description=task_description,
            agent=agent,
            expected_output=(
                "A JSON object containing posts[] where each item includes schedule_seq, platform, "
                "scheduled_at, focus, caption, hashtags, post_type, call_to_action, media_prompts, "
                "image_prompt, reddit_title (for reddit), notes"
            ),
        )


def _infer_ext(image_url: str, content_type: str | None) -> str:
    if content_type:
        ct = content_type.lower()
        if "png" in ct:
            return ".png"
        if "jpeg" in ct or "jpg" in ct:
            return ".jpg"
        if "webp" in ct:
            return ".webp"
    parsed = urlparse(image_url)
    suffix = Path(parsed.path).suffix.lower()
    if suffix in {".png", ".jpg", ".jpeg", ".webp"}:
        return suffix
    return ".png"


def save_image_locally(image_url: str) -> Optional[str]:
    """
    Download generated image to local storage and return a stable served URL.
    """
    try:
        GENERATED_IMAGES_DIR.mkdir(parents=True, exist_ok=True)
        resp = requests.get(image_url, timeout=20)
        resp.raise_for_status()
        ext = _infer_ext(image_url, resp.headers.get("content-type"))
        filename = f"{uuid4().hex}{ext}"
        path = GENERATED_IMAGES_DIR / filename
        path.write_bytes(resp.content)
        public_base = os.getenv("AGENTS_PUBLIC_BASE_URL", "http://localhost:8001").rstrip("/")
        return f"{public_base}/generated-images/{filename}"
    except Exception as e:
        logger.error("Failed to persist generated image locally: %s", e)
        return None


def generate_post_image(
    image_prompt: str,
    business_type: str,
    api_key: Optional[str] = None,
    platform: str = "instagram",
) -> Optional[str]:
    """
    Generate a social-ready image using DALL-E 3.

    Args:
        image_prompt: Detailed prompt for image generation
        business_type: Type of business (for prompt enhancement)
        api_key: OpenAI API key (optional, uses env var if not provided)
        platform: Target platform (affects style hints)

    Returns:
        URL of the generated image, or None if generation fails
    """
    try:
        from openai import OpenAI
        
        client = OpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
        
        plat = (platform or "instagram").lower()
        if plat == "reddit":
            style = (
                "natural candid photo, Reddit-authentic vibe, high quality, clean composition, "
                "professional food photography where relevant"
            )
        else:
            style = "professional food photography, Instagram-worthy, high quality, vibrant colors, appealing composition"
        enhanced_prompt = f"{image_prompt}, {style}"
        
        logger.info(f"Generating image with DALL-E: {enhanced_prompt[:100]}...")
        
        response = client.images.generate(
            model="dall-e-3",
            prompt=enhanced_prompt,
            size="1024x1024",  # Square format for Instagram
            quality="standard",
            n=1,
        )
        
        image_url = response.data[0].url
        stable_url = save_image_locally(image_url)
        if stable_url:
            logger.info("✓ Image generated and saved locally: %s", stable_url)
            return stable_url
        logger.warning("Image generated but local save failed; returning temporary URL")
        return image_url
        
    except Exception as e:
        logger.error(f"Failed to generate image: {e}")
        return None


def generate_instagram_image(image_prompt: str, business_type: str, api_key: Optional[str] = None) -> Optional[str]:
    """Backward-compatible alias for generate_post_image."""
    return generate_post_image(image_prompt, business_type, api_key=api_key, platform="instagram")


def parse_content_output(raw_output: str) -> ContentOutput:
    """Extract JSON block from LLM output and validate."""
    start_idx = raw_output.find("{")
    end_idx = raw_output.rfind("}") + 1
    if start_idx != -1 and end_idx > start_idx:
        data = json.loads(raw_output[start_idx:end_idx])
        return ContentOutput(**data)
    return ContentOutput(posts=[])


def run_content_agent(
    business_type: str,
    campaign_goals: str,
    analysis_data: Dict,
    competitor_data: Optional[Dict] = None,
    api_key: Optional[str] = None,
) -> ContentOutput:
    """Run content generation using the same OpenAI key as analysis."""
    import os
    from crewai import Crew

    if api_key:
        os.environ["OPENAI_API_KEY"] = api_key

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)

    agent = ContentAgentConfig.create_agent(llm)
    # Merge analysis and competitor data for richer insights
    combined_data = {**analysis_data}
    if competitor_data:
        # Add competitor insights to analysis data
        combined_data.update({
            "competitor_themes": competitor_data.get("trending_themes", []),
            "competitor_hashtags": competitor_data.get("recommended_hashtags", []),
            "market_positioning": competitor_data.get("market_positioning", ""),
            "suggested_price_point": competitor_data.get("suggested_price_point", "")
        })

    schedule_plan = combined_data.get("schedule_plan") or []
    target_posts = expand_schedule_targets(schedule_plan)
    if not target_posts:
        target_posts = [
            {
                "schedule_seq": 1,
                "scheduled_at": "",
                "focus": campaign_goals[:200] if campaign_goals else "Campaign kickoff",
                "platform": "instagram",
            }
        ]
    platforms_needed = _dedupe_preserve_order([str(r.get("platform", "")) for r in target_posts])

    task = ContentAgentConfig.create_task(
        agent=agent,
        business_type=business_type,
        campaign_goals=campaign_goals,
        analysis=combined_data,
        target_posts=target_posts,
        platforms_needed=platforms_needed,
    )

    crew = Crew(agents=[agent], tasks=[task], verbose=True)
    result = crew.kickoff()
    content_output = parse_content_output(str(result))
    
    for i, post in enumerate(content_output.posts):
        plat = (post.platform or "").lower()
        prompt = post.image_prompt or (post.media_prompts[0] if post.media_prompts else None)
        if not prompt:
            continue
        if plat == "reddit" and (post.post_type or "").lower().strip() in ("text post", "text"):
            logger.info("Skipping image generation for Reddit text post schedule_seq=%s", post.schedule_seq)
            continue
        logger.info("Generating image with DALL-E for schedule_seq=%s platform=%s...", post.schedule_seq, plat)
        image_url = generate_post_image(
            image_prompt=prompt,
            business_type=business_type,
            api_key=api_key,
            platform=plat,
        )
        if image_url:
            content_output.posts[i].image_url = image_url
            if not content_output.posts[i].image_prompt:
                content_output.posts[i].image_prompt = prompt
        else:
            logger.warning("⚠ Image generation failed for schedule_seq=%s", post.schedule_seq)
    
    return content_output


if __name__ == "__main__":
    # Quick manual test
    demo_analysis = {
        "target_audience": "Young professionals 22-34 in downtown area",
        "engagement_times": ["11:00", "14:00", "19:00"],
        "content_tone": "playful",
    }
    out = run_content_agent(
        business_type="donut shop",
        campaign_goals="Promote BOGO donut offer",
        analysis_data=demo_analysis,
    )
    print(json.dumps(out.dict(), indent=2))


