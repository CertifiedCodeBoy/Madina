import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class EnergyReading(Base):
    __tablename__ = "energy_readings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String, nullable=False)
    district = Column(String, nullable=False)
    kwh_consumed = Column(Float, nullable=False)
    kwh_solar_generated = Column(Float, nullable=True, default=0)
    kwh_sold_to_grid = Column(Float, nullable=True, default=0)
    reading_hour = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class EnergyGridStatus(Base):
    __tablename__ = "energy_grid_status"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    district = Column(String, nullable=False)
    status = Column(String, nullable=False)   # normal | outage | degraded
    load_pct = Column(Float, nullable=True)
    outage_start = Column(DateTime, nullable=True)
    estimated_restore = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)


class ParkingLot(Base):
    __tablename__ = "parking_lots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    total_spots = Column(Integer, nullable=False)
    available_spots = Column(Integer, nullable=False)
    district = Column(String, nullable=True)
    predicted_availability_1h = Column(Integer, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)
