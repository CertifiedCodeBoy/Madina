"""
Demand Prediction Service.

• Parking availability: Random Forest model predicting available spots 1 hour ahead
  based on time-of-day, day-of-week, and current occupancy.

• Transit delay: Gradient Boosting model predicting route delay in minutes.

• Trip planner: simplified multimodal routing using haversine distance + predicted
  transit delays to build a walk+transit itinerary.

Models are loaded from disk if present; otherwise lightweight numpy-based
heuristics are used so the API remains functional without trained weights.
"""

import asyncio
import logging
import math
import pickle
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Optional

import numpy as np

from app.schemas.transit import TripLeg, TripPlanResponse, TripPlanRequest

logger = logging.getLogger(__name__)

PARKING_MODEL_PATH = "ai/demand_predictor/parking_rf.pkl"
TRANSIT_MODEL_PATH = "ai/demand_predictor/transit_gb.pkl"

WALK_SPEED_KPH = 5.0
BUS_SPEED_KPH = 22.0
METRO_SPEED_KPH = 45.0
CO2_PER_CAR_KM = 0.21  # kg CO₂ per km (average petrol car)


@lru_cache(maxsize=1)
def _load_parking_model():
    if Path(PARKING_MODEL_PATH).exists():
        with open(PARKING_MODEL_PATH, "rb") as f:
            model = pickle.load(f)
        logger.info("Loaded parking RF model from %s", PARKING_MODEL_PATH)
        return model
    logger.info("Parking model not found — using heuristic.")
    return None


@lru_cache(maxsize=1)
def _load_transit_model():
    if Path(TRANSIT_MODEL_PATH).exists():
        with open(TRANSIT_MODEL_PATH, "rb") as f:
            model = pickle.load(f)
        logger.info("Loaded transit GB model from %s", TRANSIT_MODEL_PATH)
        return model
    logger.info("Transit model not found — using heuristic.")
    return None


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _heuristic_parking_prediction(total_spots: int, available_spots: int) -> int:
    """Simple heuristic: slight improvement toward average during next hour."""
    now = datetime.utcnow()
    hour = now.hour
    # Peak hours 08-10, 12-14, 17-20 → expect fewer spots
    if hour in range(8, 10) or hour in range(12, 14) or hour in range(17, 20):
        delta = -int(total_spots * 0.05)
    else:
        delta = int(total_spots * 0.03)
    predicted = max(0, min(total_spots, available_spots + delta))
    return predicted


async def predict_parking(lot) -> int:
    """Predict available parking spots 1 hour ahead for a given lot."""
    model = _load_parking_model()
    if model is not None:
        now = datetime.utcnow()
        X = np.array([[now.hour, now.weekday(), lot.available_spots, lot.total_spots]])
        loop = asyncio.get_event_loop()
        pred = await loop.run_in_executor(None, model.predict, X)
        return max(0, int(pred[0]))
    return _heuristic_parking_prediction(lot.total_spots, lot.available_spots)


async def predict_transit_delay(route_id: str, hour: int, weekday: int) -> float:
    """Predict delay in minutes for a transit route."""
    model = _load_transit_model()
    if model is not None:
        X = np.array([[hash(route_id) % 100, hour, weekday]])
        loop = asyncio.get_event_loop()
        pred = await loop.run_in_executor(None, model.predict, X)
        return max(0.0, float(pred[0]))
    # Heuristic
    if hour in range(7, 10) or hour in range(17, 20):
        return round(np.random.uniform(3, 8), 1)
    return round(np.random.uniform(0, 3), 1)


async def predict_trip(payload: TripPlanRequest) -> TripPlanResponse:
    """
    Build a simple walk + metro/bus + walk multimodal trip plan.
    Uses haversine distance and predicted transit delays.
    """
    total_dist = _haversine_km(
        payload.origin_lat, payload.origin_lng,
        payload.dest_lat, payload.dest_lng,
    )

    now = datetime.utcnow()
    delay = await predict_transit_delay("city_metro_1", now.hour, now.weekday())

    # Simplified itinerary: walk to nearest stop (20% dist), transit (60%), walk (20%)
    walk_dist = round(total_dist * 0.2, 2)
    transit_dist = round(total_dist * 0.6, 2)
    walk2_dist = round(total_dist * 0.2, 2)

    walk1_mins = round(walk_dist / WALK_SPEED_KPH * 60, 1)
    transit_mins = round(transit_dist / METRO_SPEED_KPH * 60 + delay, 1)
    walk2_mins = round(walk2_dist / WALK_SPEED_KPH * 60, 1)
    total_mins = walk1_mins + transit_mins + walk2_mins

    co2_saved = round(total_dist * CO2_PER_CAR_KM, 3)

    legs = [
        TripLeg(mode="walk", duration_minutes=walk1_mins, distance_km=walk_dist),
        TripLeg(
            mode="metro",
            route_id="metro_1",
            route_name="Line 1",
            from_stop="Central Station",
            to_stop="City Hall",
            duration_minutes=transit_mins,
            distance_km=transit_dist,
        ),
        TripLeg(mode="walk", duration_minutes=walk2_mins, distance_km=walk2_dist),
    ]

    return TripPlanResponse(
        total_duration_minutes=round(total_mins, 1),
        total_distance_km=round(total_dist, 2),
        co2_saved_kg=co2_saved,
        legs=legs,
    )
