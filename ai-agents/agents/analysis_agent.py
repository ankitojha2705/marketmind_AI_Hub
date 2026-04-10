"""
Analysis Agent: Identifies target audience, posting windows, and behavioral trends
"""
from crewai import Agent, Task
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field
from typing import List, Optional
import json
from datetime import datetime, timedelta, timezone

# Output schema for Analysis Agent
class SchedulePlanItem(BaseModel):
    seq: int = Field(description="1-based sequence number of post")
    scheduled_at: str = Field(description="ISO date-time string in UTC")
    focus: str = Field(description="What this post should focus on")
    platforms: List[str] = Field(description="Platforms for this post")


class AnalysisOutput(BaseModel):
    objective: str = Field(description="Campaign objective inferred from brief and goals")
    target_audience: str = Field(description="Description of the target audience demographics")
    content_tone: str = Field(description="Recommended tone for content")
    platform_insights: Optional[dict] = Field(default={}, description="Additional Instagram-specific insights")
    schedule_plan: List[SchedulePlanItem] = Field(default_factory=list, description="Planned posting schedule")

class AnalysisAgentConfig:
    """Configuration and creation of the Analysis Agent"""
    
    @staticmethod
    def create_agent(llm: ChatOpenAI) -> Agent:
        """
        Creates the Analysis Agent with specific role and capabilities
        
        Args:
            llm: Language model instance
            
        Returns:
            Configured CrewAI Agent
        """
        return Agent(
            role="Social Media Audience Analyst",
            goal="Analyze target audience behavior and identify optimal posting strategies for food businesses on Instagram",
            backstory="""You are an expert social media analyst specializing in the food industry.
            You understand Instagram's algorithm, audience behavior patterns, and how food content performs.
            You analyze business types, locations, and goals to provide data-driven insights about:
            - Who the target audience is (age, interests, location)
            - When they are most active on Instagram
            - What content tone resonates with them
            - How frequently to post for maximum engagement
            
            You base your analysis on Instagram best practices, food industry trends, and local market dynamics.""",
            verbose=True,
            allow_delegation=False,
            llm=llm
        )
    
    @staticmethod
    def create_task(
        agent: Agent,
        business_type: str,
        location: Optional[str],
        campaign_goals: str,
        campaign_name: str,
        campaign_brief: str,
        post_count: int,
        start_date: datetime,
        end_date: datetime,
        platforms: List[str],
    ) -> Task:
        """
        Creates the analysis task with specific inputs
        
        Args:
            agent: The Analysis Agent
            business_type: Type of food business (e.g., "donut shop", "bakery")
            location: Optional location for local targeting
            campaign_goals: User's campaign objectives
            
        Returns:
            Configured CrewAI Task
        """
        location_info = f"located in {location}" if location else "with general regional appeal"
        
        task_description = f"""
        Analyze a campaign strategy for a {business_type} {location_info}.
        
        Campaign Name: {campaign_name}
        Campaign Goals: {campaign_goals}
        Campaign Brief: {campaign_brief}
        Start Date: {start_date.isoformat()}
        End Date: {end_date.isoformat()}
        Number of Posts: {post_count}
        Platforms: {', '.join(platforms)}
        
        Provide a comprehensive analysis including:
        1. Objective: single concise objective statement
        2. Target Audience: primary demographic (age range, interests, lifestyle)
        3. Content Tone: tone and style (e.g., casual, professional, playful, inspiring)
        4. Platform Insights: platform-specific recommendations
        5. Schedule Plan: exactly {post_count} entries distributed between start/end dates,
           each with:
           - seq (1-based incremental)
           - scheduled_at (ISO datetime)
           - focus (unique angle for that post)
           - platforms (array; for now usually all selected platforms)
        
        Consider:
        - Instagram's algorithm favors consistent posting and high engagement
        - Food content performs well during meal times and evening browsing hours
        - Local businesses benefit from community-focused content
        - Visual appeal is critical for food industry success
        
        Format your response as a structured JSON that matches this schema:
        {{
            "objective": "one concise objective",
            "target_audience": "description of audience",
            "content_tone": "recommended tone",
            "platform_insights": {{
                "story_frequency": "recommendation",
                "reel_priority": "high/medium/low",
                "carousel_usage": "recommendation"
            }},
            "schedule_plan": [
                {{
                    "seq": 1,
                    "scheduled_at": "2026-01-15T18:00:00Z",
                    "focus": "hook/focus for this post",
                    "platforms": ["instagram"]
                }}
            ]
        }}
        """
        
        return Task(
            description=task_description,
            agent=agent,
            expected_output="""A JSON object containing:
            - objective: string objective statement
            - target_audience: string describing demographics
            - content_tone: string describing recommended tone
            - platform_insights: object with platform recommendations
            - schedule_plan: array of schedule entries with seq, scheduled_at, focus, platforms"""
        )

# Utility function to parse agent output
def parse_analysis_output(raw_output: str) -> AnalysisOutput:
    """
    Parse the agent's output into structured format
    
    Args:
        raw_output: Raw text output from the agent
        
    Returns:
        Parsed AnalysisOutput object
    """
    try:
        # Try to extract JSON from the output
        start_idx = raw_output.find('{')
        end_idx = raw_output.rfind('}') + 1
        
        if start_idx != -1 and end_idx > start_idx:
            json_str = raw_output[start_idx:end_idx]
            data = json.loads(json_str)
            return AnalysisOutput(**data)
        else:
            # Fallback: create a default output
            return AnalysisOutput(
                objective="Increase campaign performance with focused content and timing",
                target_audience="General food enthusiasts",
                content_tone="warm and inviting",
                platform_insights={},
                schedule_plan=[]
            )
    except Exception as e:
        print(f"Error parsing analysis output: {e}")
        raise

# Example usage function
def _fallback_schedule_plan(
    post_count: int,
    start_date: datetime,
    end_date: datetime,
    platforms: List[str],
) -> List[SchedulePlanItem]:
    if post_count < 1:
        return []
    if end_date < start_date:
        end_date = start_date
    if start_date.tzinfo is None:
        start_date = start_date.replace(tzinfo=timezone.utc)
    if end_date.tzinfo is None:
        end_date = end_date.replace(tzinfo=timezone.utc)

    if post_count == 1:
        slots = [start_date + timedelta(hours=18)]
    else:
        total_seconds = max((end_date - start_date).total_seconds(), 1)
        step = total_seconds / (post_count - 1)
        slots = [start_date + timedelta(seconds=step * i, hours=18) for i in range(post_count)]
    return [
        SchedulePlanItem(
            seq=i + 1,
            scheduled_at=slots[i].isoformat().replace("+00:00", "Z"),
            focus=f"Post {i+1}: highlight a different campaign angle",
            platforms=platforms or ["instagram"],
        )
        for i in range(post_count)
    ]


def run_analysis_agent(
    business_type: str,
    location: Optional[str] = None,
    campaign_goals: str = "Increase brand awareness and engagement",
    campaign_name: str = "Campaign",
    campaign_brief: str = "",
    post_count: int = 1,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    platforms: Optional[List[str]] = None,
    api_key: Optional[str] = None,
) -> AnalysisOutput:
    """
    Run the Analysis Agent with given parameters
    
    Args:
        business_type: Type of food business
        location: Optional location
        campaign_goals: Campaign objectives
        api_key: OpenAI API key (or set OPENAI_API_KEY env var)
        
    Returns:
        AnalysisOutput with recommendations
    """
    from crewai import Crew
    import os
    
    # Initialize LLM
    if api_key:
        os.environ["OPENAI_API_KEY"] = api_key
    
    llm = ChatOpenAI(
        model="gpt-4o-mini",  # Using gpt-4o-mini 
        temperature=0.7
    )
    
    # Create agent and task
    agent = AnalysisAgentConfig.create_agent(llm)
    start = start_date or datetime.now(timezone.utc)
    end = end_date or start
    selected_platforms = platforms or ["instagram"]

    task = AnalysisAgentConfig.create_task(
        agent,
        business_type,
        location,
        campaign_goals,
        campaign_name,
        campaign_brief,
        post_count,
        start,
        end,
        selected_platforms,
    )
    
    # Create crew and execute
    crew = Crew(
        agents=[agent],
        tasks=[task],
        verbose=True
    )
    
    result = crew.kickoff()
    
    # Parse and return structured output
    parsed = parse_analysis_output(str(result))
    if not parsed.schedule_plan:
        parsed.schedule_plan = _fallback_schedule_plan(post_count, start, end, selected_platforms)
    return parsed

if __name__ == "__main__":
    # Test the agent
    result = run_analysis_agent(
        business_type="donut shop",
        location="Los Angeles",
        campaign_goals="Increase local foot traffic and build Instagram following"
    )
    
    print("\n=== Analysis Agent Output ===")
    print(json.dumps(result.dict(), indent=2))