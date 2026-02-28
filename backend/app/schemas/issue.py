from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.models.issue import IssueCategory, IssueSeverity, IssueStatus


class IssueCreate(BaseModel):
    reporter_id: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class IssueAIResult(BaseModel):
    category: IssueCategory
    severity: IssueSeverity
    department: str
    estimated_resolution_days: int
    confidence: float


class IssueResponse(BaseModel):
    id: UUID
    reporter_id: Optional[str]
    category: IssueCategory
    severity: IssueSeverity
    status: IssueStatus
    description: Optional[str]
    image_url: Optional[str]
    address: Optional[str]
    department: Optional[str]
    estimated_resolution_days: Optional[int]
    ai_confidence: Optional[float]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class IssueStatusUpdate(BaseModel):
    status: IssueStatus
