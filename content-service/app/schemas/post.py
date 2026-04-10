from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, model_validator


class PostCreate(BaseModel):
    scheduleSeq: int = Field(..., ge=1)
    platform: str = Field(..., min_length=1, max_length=40)
    scheduledAt: datetime
    focus: str = Field(..., min_length=1, max_length=500)
    caption: str = Field(..., min_length=1, max_length=8000)
    hashtags: list[str] = Field(default_factory=list)
    selectedHashtags: list[str] = Field(default_factory=list)
    postType: str | None = Field(default=None, min_length=1, max_length=40)
    callToAction: str | None = Field(default=None, min_length=1, max_length=500)
    seo: dict[str, Any] = Field(default_factory=dict)
    media: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_selected(self):
        if len(self.selectedHashtags) > 5:
            raise ValueError("selectedHashtags can contain at most 5 items")
        return self


class PostUpdate(BaseModel):
    scheduledAt: datetime | None = None
    focus: str | None = Field(default=None, min_length=1, max_length=500)
    caption: str | None = Field(default=None, min_length=1, max_length=8000)
    hashtags: list[str] | None = None
    selectedHashtags: list[str] | None = None
    postType: str | None = Field(default=None, min_length=1, max_length=40)
    callToAction: str | None = Field(default=None, min_length=1, max_length=500)
    seo: dict[str, Any] | None = None
    media: dict[str, Any] | None = None

    @model_validator(mode="after")
    def validate_selected(self):
        if self.selectedHashtags is not None and len(self.selectedHashtags) > 5:
            raise ValueError("selectedHashtags can contain at most 5 items")
        return self


class PostOut(BaseModel):
    id: str
    brandId: str
    campaignId: str
    createdBy: str
    updatedBy: str
    scheduleSeq: int
    platform: str
    scheduledAt: datetime
    focus: str
    caption: str
    hashtags: list[str]
    selectedHashtags: list[str]
    postType: str
    callToAction: str
    seo: dict[str, Any]
    media: dict[str, Any]
    status: str
    publishedAt: datetime | None = None
    createdAt: datetime
    updatedAt: datetime
