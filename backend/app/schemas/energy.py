from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel


class EnergyReadingResponse(BaseModel):
    kwh_consumed: float
    kwh_solar_generated: float
    kwh_sold_to_grid: float
    reading_hour: datetime

    class Config:
        from_attributes = True


class EnergyDashboardResponse(BaseModel):
    user_id: str
    period_kwh: float
    district_avg_kwh: float
    savings_tip: str
    solar_kwh: float
    grid_kwh_sold: float
    recent_readings: List[EnergyReadingResponse]


class GridStatusResponse(BaseModel):
    id: UUID
    district: str
    status: str
    load_pct: Optional[float]
    outage_start: Optional[datetime]
    estimated_restore: Optional[datetime]

    class Config:
        from_attributes = True


class ParkingLotResponse(BaseModel):
    id: UUID
    name: str
    latitude: float
    longitude: float
    total_spots: int
    available_spots: int
    district: Optional[str]
    predicted_availability_1h: Optional[int]
    occupancy_pct: float
    updated_at: datetime

    class Config:
        from_attributes = True
