from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models.transit import AQIReading, RoadDisruption, TransitVehicle
from app.schemas.transit import (
    AQIReadingResponse,
    RoadDisruptionResponse,
    TransitVehicleResponse,
    TripPlanRequest,
    TripPlanResponse,
)
from app.services.city_data import fetch_live_aqi, fetch_live_transit
from app.services.demand_prediction import predict_trip

router = APIRouter(prefix="/transit", tags=["Transit & AQI"])


@router.get("/vehicles", response_model=List[TransitVehicleResponse])
async def get_vehicles(
    vehicle_type: str = None,
    route_id: str = None,
    db: AsyncSession = Depends(get_db),
):
    """Return real-time positions of all public transport vehicles."""
    await fetch_live_transit(db)
    q = select(TransitVehicle)
    if vehicle_type:
        q = q.where(TransitVehicle.vehicle_type == vehicle_type)
    if route_id:
        q = q.where(TransitVehicle.route_id == route_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/aqi", response_model=List[AQIReadingResponse])
async def get_aqi(district: str = None, db: AsyncSession = Depends(get_db)):
    """Return latest AQI readings by district."""
    await fetch_live_aqi(db)
    q = select(AQIReading).order_by(AQIReading.recorded_at.desc()).limit(100)
    if district:
        q = q.where(AQIReading.district == district)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/disruptions", response_model=List[RoadDisruptionResponse])
async def get_disruptions(db: AsyncSession = Depends(get_db)):
    """Return active road disruptions."""
    q = select(RoadDisruption).where(RoadDisruption.active == True).order_by(  # noqa: E712
        RoadDisruption.created_at.desc()
    )
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/trip-plan", response_model=TripPlanResponse)
async def plan_trip(payload: TripPlanRequest):
    """
    Multimodal trip planner: walking + bus + metro.
    Uses demand prediction model to factor in real-time crowding.
    """
    return await predict_trip(payload)
