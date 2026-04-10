from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, model_validator

# Stored lowercase in MongoDB. Lifecycle: draft → scheduled → active → completed;
# draft/scheduled → cancelled; completed/cancelled → archived.
CAMPAIGN_STATUS_PATTERN = (
    "^(draft|scheduled|active|completed|cancelled|archived)$"
)


class Audience(BaseModel):
    ageMin: int = Field(default=18, ge=13, le=100)
    ageMax: int = Field(default=65, ge=13, le=100)

    @model_validator(mode="after")
    def ages_ok(self):
        if self.ageMax < self.ageMin:
            raise ValueError("ageMax must be >= ageMin")
        return self


class CampaignCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    brief: str = Field(..., min_length=1, max_length=8000)
    platforms: list[str] = Field(..., min_length=1)
    objective: str = Field(..., min_length=1, max_length=64)
    startDate: datetime
    endDate: datetime
    audience: Audience = Field(default_factory=Audience)
    postCount: int = Field(default=1, ge=1, le=5)
    status: str = Field(default="draft", pattern=CAMPAIGN_STATUS_PATTERN)

    @model_validator(mode="after")
    def dates_ok(self):
        if self.endDate < self.startDate:
            raise ValueError("endDate must be on or after startDate")
        return self


class CampaignUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    brief: str | None = Field(default=None, min_length=1, max_length=8000)
    platforms: list[str] | None = None
    objective: str | None = Field(default=None, min_length=1, max_length=64)
    startDate: datetime | None = None
    endDate: datetime | None = None
    audience: Audience | None = None
    postCount: int | None = Field(default=None, ge=1, le=5)
    status: str | None = Field(default=None, pattern=CAMPAIGN_STATUS_PATTERN)

    @model_validator(mode="after")
    def dates_ok(self):
        if self.startDate is not None and self.endDate is not None:
            if self.endDate < self.startDate:
                raise ValueError("endDate must be on or after startDate")
        return self


class CampaignOut(BaseModel):
    id: str
    brandId: str
    createdBy: str
    name: str
    brief: str
    platforms: list[str]
    status: str
    objective: str
    startDate: datetime
    endDate: datetime
    audience: dict[str, Any]
    postCount: int
    createdAt: datetime
    updatedAt: datetime
