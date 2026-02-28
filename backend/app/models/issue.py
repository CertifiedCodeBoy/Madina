import enum
import uuid
from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class IssueCategory(str, enum.Enum):
    pothole = "pothole"
    broken_light = "broken_light"
    illegal_dumping = "illegal_dumping"
    graffiti = "graffiti"
    damaged_sign = "damaged_sign"
    tree_hazard = "tree_hazard"
    water_leak = "water_leak"
    other = "other"


class IssueSeverity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class IssueStatus(str, enum.Enum):
    pending = "pending"
    triaged = "triaged"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"


class Issue(Base):
    __tablename__ = "issues"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    reporter_id = Column(String, nullable=True)  # optional citizen ID
    category = Column(Enum(IssueCategory), nullable=False)
    severity = Column(Enum(IssueSeverity), nullable=False, default=IssueSeverity.medium)
    status = Column(Enum(IssueStatus), nullable=False, default=IssueStatus.pending)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    location = Column(Geometry("POINT", srid=4326), nullable=True)
    address = Column(String, nullable=True)
    department = Column(String, nullable=True)
    estimated_resolution_days = Column(Integer, nullable=True)
    ai_confidence = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
