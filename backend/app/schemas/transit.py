from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class TransitVehicleResponse(BaseModel):
    id: UUID
    vehicle_id: str
    route_id: str
    route_name: Optional[str]
    vehicle_type: str
    latitude: float
    longitude: float
    speed_kmh: Optional[float]
    occupancy_pct: Optional[float]
    delay_minutes: Optional[float]
    updated_at: datetime

    class Config:
        from_attributes = True


class AQIReadingResponse(BaseModel):
    id: UUID
    district: str
    aqi: int
    pm25: Optional[float]
    pm10: Optional[float]
    no2: Optional[float]
    o3: Optional[float]
    health_recommendation: Optional[str]
    recorded_at: datetime

    class Config:
        from_attributes = True


class RoadDisruptionResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str]
    disruption_type: str
    start_lat: float
    start_lng: float
    end_lat: Optional[float]
    end_lng: Optional[float]
    severity: str
    active: bool
    starts_at: Optional[datetime]
    ends_at: Optional[datetime]

    class Config:
        from_attributes = True


class TripPlanRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    dest_lat: float
    dest_lng: float


class TripLeg(BaseModel):
    mode: str          # walk | bus | metro | tram
    route_id: Optional[str]
    route_name: Optional[str]
    from_stop: Optional[str]
    to_stop: Optional[str]
    duration_minutes: float
    distance_km: float


class TripPlanResponse(BaseModel):
    total_duration_minutes: float
    total_distance_km: float
    co2_saved_kg: float
    legs: List[TripLeg]
