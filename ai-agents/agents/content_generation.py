"""
Content Generation Agent: Produces Instagram-ready content using analysis insights
"""
from crewai import Agent, Task
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field, model_validator
from typing import List, Optional, Dict
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
    caption: str = Field(description="Primary post caption")
    hashtags: List[str] = Field(default_factory=list, description="Relevant hashtags for this post")
    post_type: str = Field(description="Recommended post type: Reel | Story | Carousel | Photo")
    call_to_action: str = Field(description="Call to action")
    media_prompts: List[str] = Field(default_factory=list, description="Media prompts for this post")
    image_prompt: Optional[str] = Field(default=None, description="Image prompt for generation")
    image_url: Optional[str] = Field(default=None, description="Generated image URL")
    notes: Optional[str] = Field(default=None, description="Optional notes")

    @model_validator(mode="after")
    def backfill_hashtags_from_caption(self):
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


class ContentAgentConfig:
    """Configuration and creation of the Content Generation Agent"""

    @staticmethod
    def create_agent(llm: ChatOpenAI) -> Agent:
        return Agent(
            role="Instagram Content Strategist",
            goal=(
                "Generate high-performing, platform-native Instagram content that aligns with "
                "the provided audience insights and campaign goals."
            ),
            backstory=(
                "You are a seasoned social media strategist for food & beverage SMBs. "
                "You create concise, scroll-stopping Instagram content (captions, hashtags, "
                "post type) that converts. You follow Instagram best practices, stay within "
                "platform norms, and write in the specified tone."
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
    ) -> Task:
        """Create the generation task informed by analysis and competitor data."""
        target_audience = analysis.get("target_audience", "local audience")
        schedule_plan = analysis.get("schedule_plan", [])
        content_tone = analysis.get("content_tone", "friendly")
        competitor_themes = analysis.get("competitor_themes", [])
        competitor_hashtags = analysis.get("competitor_hashtags", [])
        market_position = analysis.get("market_positioning", "")
        price_point = analysis.get("suggested_price_point", "")

        task_description = f"""
        Using the insights below, generate one post per schedule entry.

        Business Type: {business_type}
        Campaign Goal: {campaign_goals}

        Audience Insight: {target_audience}
        Schedule Plan: {json.dumps(schedule_plan)}
        Recommended Tone: {content_tone}

        Market Context:
        - Competitor Themes: {', '.join(competitor_themes) if competitor_themes else 'Not available'}
        - Market Position: {market_position}
        - Price Point: {price_point}

        Requirements:
        - Generate exactly one post per schedule_plan entry (same seq as provided)
        - Tailor each post to that entry's focus and platform
        - Produce concise, engaging caption matching the tone
        - Include clear call-to-action aligned with the goal
        - Recommend post type (Reel | Story | Carousel | Photo)
        - Provide 10-15 relevant non-spammy hashtags
        - Suggest 2-4 media prompts
        - Provide image_prompt for each post
        - Image prompts must produce visuals with NO readable text anywhere
        - Do not include words, letters, captions, logos, watermarks, labels, menus, packaging text, or signage text in the scene
        - Prefer clean compositions focused on products/people/environment without typography
        - Keep schedule metadata from schedule_plan in output
        - Avoid ALL caps and excessive emojis; use at most 1-2 where appropriate
        - Position content uniquely against competitors while staying authentic

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
              "post_type": "Reel|Story|Carousel|Photo",
              "call_to_action": "string",
              "media_prompts": ["prompt1", "prompt2"],
              "image_prompt": "detailed description for DALL-E image generation",
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
                "scheduled_at, focus, caption, hashtags, post_type, call_to_action, media_prompts, image_prompt, notes"
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


def generate_instagram_image(image_prompt: str, business_type: str, api_key: Optional[str] = None) -> Optional[str]:
    """
    Generate an Instagram-ready image using DALL-E 3
    
    Args:
        image_prompt: Detailed prompt for image generation
        business_type: Type of business (for prompt enhancement)
        api_key: OpenAI API key (optional, uses env var if not provided)
        
    Returns:
        URL of the generated image, or None if generation fails
    """
    try:
        from openai import OpenAI
        
        client = OpenAI(api_key=api_key or os.getenv("OPENAI_API_KEY"))
        
        # Enhance prompt for Instagram-style images
        enhanced_prompt = f"{image_prompt}, professional food photography, Instagram-worthy, high quality, vibrant colors, appealing composition"
        
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
    
    task = ContentAgentConfig.create_task(
        agent=agent,
        business_type=business_type,
        campaign_goals=campaign_goals,
        analysis=combined_data,
    )

    crew = Crew(agents=[agent], tasks=[task], verbose=True)
    result = crew.kickoff()
    content_output = parse_content_output(str(result))
    
    for i, post in enumerate(content_output.posts):
        prompt = post.image_prompt or (post.media_prompts[0] if post.media_prompts else None)
        if not prompt:
            continue
        logger.info("Generating Instagram image with DALL-E for schedule_seq=%s...", post.schedule_seq)
        image_url = generate_instagram_image(
            image_prompt=prompt,
            business_type=business_type,
            api_key=api_key,
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


