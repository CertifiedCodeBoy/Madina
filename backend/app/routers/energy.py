from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models.parking import EnergyGridStatus, EnergyReading, ParkingLot
from app.schemas.energy import (
    EnergyDashboardResponse,
    GridStatusResponse,
    ParkingLotResponse,
)
from app.services.demand_prediction import predict_parking

router = APIRouter(prefix="/energy", tags=["Energy & Parking"])

SAVINGS_TIPS = [
    "Run dishwasher and washing machines after 10 PM to reduce peak-hour load.",
    "Your AC usage is 23% above district average — try setting it to 24°C.",
    "Switch remaining incandescent bulbs to LED to save up to 75% on lighting.",
    "Enable smart standby on your TV and appliances to cut idle consumption.",
    "Your solar panels generated surplus energy yesterday — consider selling to the grid.",
]


@router.get("/dashboard/{user_id}", response_model=EnergyDashboardResponse)
async def get_energy_dashboard(user_id: str, db: AsyncSession = Depends(get_db)):
    """Return a personalized energy consumption dashboard for a citizen."""
    q = (
        select(EnergyReading)
        .where(EnergyReading.user_id == user_id)
        .order_by(EnergyReading.reading_hour.desc())
        .limit(24)
    )
    result = await db.execute(q)
    readings = result.scalars().all()

    period_kwh = sum(r.kwh_consumed for r in readings)
    solar_kwh = sum(r.kwh_solar_generated for r in readings)
    grid_sold = sum(r.kwh_sold_to_grid for r in readings)

    # Simulate district average (in production: query aggregate)
    import random

    district_avg = period_kwh * random.uniform(0.85, 1.2)
    tip_idx = hash(user_id) % len(SAVINGS_TIPS)

    return EnergyDashboardResponse(
        user_id=user_id,
        period_kwh=round(period_kwh, 2),
        district_avg_kwh=round(district_avg, 2),
        savings_tip=SAVINGS_TIPS[tip_idx],
        solar_kwh=round(solar_kwh, 2),
        grid_kwh_sold=round(grid_sold, 2),
        recent_readings=readings,
    )


@router.get("/grid-status", response_model=List[GridStatusResponse])
async def get_grid_status(db: AsyncSession = Depends(get_db)):
    """Return current grid status and active outages by district."""
    result = await db.execute(select(EnergyGridStatus))
    return result.scalars().all()


@router.get("/parking", response_model=List[ParkingLotResponse])
async def get_parking(district: str = None, db: AsyncSession = Depends(get_db)):
    """Return parking lot availability with ML-predicted 1-hour forecast."""
    q = select(ParkingLot)
    if district:
        q = q.where(ParkingLot.district == district)
    result = await db.execute(q)
    lots = result.scalars().all()

    # Apply ML prediction for each lot
    for lot in lots:
        lot.predicted_availability_1h = await predict_parking(lot)
        lot.occupancy_pct = round(
            100 * (1 - lot.available_spots / lot.total_spots), 1
        ) if lot.total_spots > 0 else 0

    return lots
