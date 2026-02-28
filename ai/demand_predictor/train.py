"""
Train parking availability and transit delay prediction models.

Parking: Random Forest — features: hour, weekday, current_available, total_spots
Transit: Gradient Boosting — features: route_hash, hour, weekday

Usage:
    python train.py --parking_csv data/parking_history.csv \
                    --transit_csv data/transit_delays.csv  \
                    --output_dir  .

CSV column expectations:
  parking_history.csv : timestamp, lot_id, available_spots, total_spots
  transit_delays.csv  : timestamp, route_id, delay_minutes
"""

import argparse
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--parking_csv", type=str, default="data/parking_history.csv")
    p.add_argument("--transit_csv", type=str, default="data/transit_delays.csv")
    p.add_argument("--output_dir", type=str, default=".")
    return p.parse_args()


def generate_synthetic_parking(n: int = 50_000) -> pd.DataFrame:
    """Generate synthetic parking data when real CSV is unavailable."""
    rng = np.random.default_rng(42)
    hours = rng.integers(0, 24, n)
    weekdays = rng.integers(0, 7, n)
    total_spots = rng.choice([50, 100, 200, 400], n)
    # Occupancy peaks during business hours and weekends
    base_occ = 0.3 + 0.4 * np.sin((hours - 8) * np.pi / 10).clip(0, 1)
    base_occ += 0.1 * (weekdays < 5)
    current_available = (total_spots * (1 - base_occ + rng.normal(0, 0.05, n))).clip(0, total_spots).astype(int)
    future_available = (total_spots * (1 - (base_occ + 0.05) + rng.normal(0, 0.05, n))).clip(0, total_spots).astype(int)
    return pd.DataFrame({
        "hour": hours,
        "weekday": weekdays,
        "available_spots": current_available,
        "total_spots": total_spots,
        "target_available_1h": future_available,
    })


def generate_synthetic_transit(n: int = 30_000) -> pd.DataFrame:
    """Generate synthetic transit delay data."""
    rng = np.random.default_rng(42)
    hours = rng.integers(0, 24, n)
    weekdays = rng.integers(0, 7, n)
    route_ids = rng.integers(0, 10, n)
    peak = ((hours >= 7) & (hours <= 10)) | ((hours >= 17) & (hours <= 20))
    delay = 6 * peak + rng.exponential(2, n)
    return pd.DataFrame({
        "route_hash": route_ids,
        "hour": hours,
        "weekday": weekdays,
        "delay_minutes": delay,
    })


def train_parking(df: pd.DataFrame, output_dir: str):
    X = df[["hour", "weekday", "available_spots", "total_spots"]].values
    y = df["target_available_1h"].values
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(n_estimators=200, max_depth=12, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    print(f"[Parking RF] MAE={mae:.2f} spots  R²={r2:.3f}")

    path = Path(output_dir) / "parking_rf.pkl"
    with open(path, "wb") as f:
        pickle.dump(model, f)
    print(f"Saved to {path}")


def train_transit(df: pd.DataFrame, output_dir: str):
    X = df[["route_hash", "hour", "weekday"]].values
    y = df["delay_minutes"].values
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = GradientBoostingRegressor(
        n_estimators=300, max_depth=5, learning_rate=0.05, random_state=42
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    print(f"[Transit GB] MAE={mae:.2f} mins  R²={r2:.3f}")

    path = Path(output_dir) / "transit_gb.pkl"
    with open(path, "wb") as f:
        pickle.dump(model, f)
    print(f"Saved to {path}")


def main():
    args = parse_args()
    Path(args.output_dir).mkdir(parents=True, exist_ok=True)

    # Parking model
    if Path(args.parking_csv).exists():
        df_p = pd.read_csv(args.parking_csv, parse_dates=["timestamp"])
        df_p["hour"] = df_p["timestamp"].dt.hour
        df_p["weekday"] = df_p["timestamp"].dt.weekday
    else:
        print("Parking CSV not found — generating synthetic data.")
        df_p = generate_synthetic_parking()

    print(f"Parking dataset: {len(df_p):,} rows")
    train_parking(df_p, args.output_dir)

    # Transit model
    if Path(args.transit_csv).exists():
        df_t = pd.read_csv(args.transit_csv, parse_dates=["timestamp"])
        df_t["hour"] = df_t["timestamp"].dt.hour
        df_t["weekday"] = df_t["timestamp"].dt.weekday
        df_t["route_hash"] = df_t["route_id"].apply(lambda x: hash(x) % 100)
    else:
        print("Transit CSV not found — generating synthetic data.")
        df_t = generate_synthetic_transit()

    print(f"Transit dataset: {len(df_t):,} rows")
    train_transit(df_t, args.output_dir)


if __name__ == "__main__":
    main()
