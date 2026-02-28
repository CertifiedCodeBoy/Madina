import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class TransitVehicle(Base):
    __tablename__ = "transit_vehicles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id = Column(String, unique=True, nullable=False)
    route_id = Column(String, nullable=False)
    route_name = Column(String, nullable=True)
    vehicle_type = Column(String, nullable=False)  # bus | metro | tram
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    speed_kmh = Column(Float, nullable=True)
    occupancy_pct = Column(Float, nullable=True)  # 0-100
    delay_minutes = Column(Float, nullable=True, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow)


class AQIReading(Base):
    __tablename__ = "aqi_readings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    district = Column(String, nullable=False)
    aqi = Column(Integer, nullable=False)
    pm25 = Column(Float, nullable=True)
    pm10 = Column(Float, nullable=True)
    no2 = Column(Float, nullable=True)
    o3 = Column(Float, nullable=True)
    health_recommendation = Column(String, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)


class RoadDisruption(Base):
    __tablename__ = "road_disruptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    disruption_type = Column(String, nullable=False)  # planned | accident | works
    start_lat = Column(Float, nullable=False)
    start_lng = Column(Float, nullable=False)
    end_lat = Column(Float, nullable=True)
    end_lng = Column(Float, nullable=True)
    severity = Column(String, nullable=False, default="medium")
    active = Column(Boolean, default=True)
    starts_at = Column(DateTime, nullable=True)
    ends_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
