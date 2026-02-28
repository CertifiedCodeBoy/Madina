"""
City Data Aggregator Service.

Fetches and upserts live data from external city sensors / APIs into the
local database so other services can work off current snapshots.

Sources:
• Transit: GTFS-Realtime protobuf feed (falls back to mock data)
• AQI: OpenWeatherMap Air Pollution API (falls back to mock data)
"""

import logging
import random
from datetime import datetime
from typing import List

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert

from app.config import settings
from app.models.transit import AQIReading, TransitVehicle

logger = logging.getLogger(__name__)

DISTRICTS = [
    "Hydra", "Bab Ezzouar", "Hussein Dey", "Kouba", "El Harrach",
    "Bir Mourad Raïs", "Ben Aknoun", "Birkhadem", "Bouzareah", "Dar El Beïda",
]

VEHICLE_TYPES = ["bus", "metro", "tram"]
ROUTE_NAMES = {
    "bus": ["Line 21", "Line 35", "Line 47", "Line 52", "Line 68"],
    "metro": ["M1 East", "M1 West", "M2 North"],
    "tram": ["T1", "T2"],
}

AQI_HEALTH: dict[str, str] = {
    range(0, 51): "Air quality is good — enjoy outdoor activities.",
    range(51, 101): "Moderate — sensitive individuals should limit prolonged outdoor exertion.",
    range(101, 151): "Unhealthy for sensitive groups — wear a mask if going out.",
    range(151, 201): "Unhealthy — avoid outdoor activities.",
    range(201, 301): "Very unhealthy — stay indoors.",
}


def _aqi_recommendation(aqi: int) -> str:
    for r, msg in AQI_HEALTH.items():
        if aqi in r:
            return msg
    return "Air quality is hazardous — stay indoors and close windows."


def _mock_vehicles() -> List[dict]:
    vehicles = []
    for i in range(20):
        vtype = random.choice(VEHICLE_TYPES)
        route_id = f"{vtype}_{random.randint(1, 5)}"
        vehicles.append(
            {
                "vehicle_id": f"{vtype.upper()}-{100 + i}",
                "route_id": route_id,
                "route_name": random.choice(ROUTE_NAMES[vtype]),
                "vehicle_type": vtype,
                "latitude": 36.737232 + random.uniform(-0.1, 0.1),
                "longitude": 3.086472 + random.uniform(-0.1, 0.1),
                "speed_kmh": random.uniform(0, 50),
                "occupancy_pct": random.uniform(10, 95),
                "delay_minutes": random.uniform(-1, 10),
                "updated_at": datetime.utcnow(),
            }
        )
    return vehicles


def _mock_aqi() -> List[dict]:
    return [
        {
            "district": d,
            "aqi": (aqi := random.randint(20, 180)),
            "pm25": round(random.uniform(5, 60), 1),
            "pm10": round(random.uniform(10, 80), 1),
            "no2": round(random.uniform(5, 40), 1),
            "o3": round(random.uniform(20, 80), 1),
            "health_recommendation": _aqi_recommendation(aqi),
            "recorded_at": datetime.utcnow(),
        }
        for d in DISTRICTS
    ]


async def fetch_live_transit(db: AsyncSession) -> None:
    """
    Pull GTFS-RT feed (or mock) and upsert vehicle positions into the DB.
    Called transparently before each GET /transit/vehicles request.
    """
    gtfs_url = settings.TRANSIT_GTFS_REALTIME_URL
    vehicles = []

    if gtfs_url:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(gtfs_url)
                resp.raise_for_status()
                # Parse protobuf here if google.transit.gtfs_realtime_pb2 available
                # For now, log and fall through to mock
                logger.info("GTFS-RT feed fetched (%d bytes)", len(resp.content))
        except Exception as exc:
            logger.warning("GTFS-RT fetch failed: %s — using mock data.", exc)

    if not vehicles:
        vehicles = _mock_vehicles()

    for v in vehicles:
        stmt = (
            insert(TransitVehicle)
            .values(**v)
            .on_conflict_do_update(
                index_elements=["vehicle_id"],
                set_={k: v[k] for k in v if k != "vehicle_id"},
            )
        )
        await db.execute(stmt)
    await db.commit()


async def fetch_live_aqi(db: AsyncSession) -> None:
    """
    Pull AQI from OpenWeatherMap API (or mock) and insert readings.
    """
    api_key = settings.AQI_API_KEY
    readings = []

    if api_key:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                # Example: Algiers coordinates
                resp = await client.get(
                    settings.AQI_API_URL,
                    params={"lat": 36.7372, "lon": 3.0864, "appid": api_key},
                )
                resp.raise_for_status()
                data = resp.json()
                components = data["list"][0]["components"]
                aqi_val = data["list"][0]["main"]["aqi"] * 50
                readings.append(
                    AQIReading(
                        district="Algiers Centre",
                        aqi=aqi_val,
                        pm25=components.get("pm2_5"),
                        pm10=components.get("pm10"),
                        no2=components.get("no2"),
                        o3=components.get("o3"),
                        health_recommendation=_aqi_recommendation(aqi_val),
                    )
                )
        except Exception as exc:
            logger.warning("AQI API fetch failed: %s — using mock data.", exc)

    if not readings:
        for row in _mock_aqi():
            readings.append(AQIReading(**row))

    db.add_all(readings)
    await db.commit()
