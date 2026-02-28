from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Madina Smart City API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://madina:madina@localhost:5432/madina_db"
    DATABASE_SYNC_URL: str = "postgresql://madina:madina@localhost:5432/madina_db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Firebase
    FIREBASE_CREDENTIALS_PATH: Optional[str] = None

    # Mapbox
    MAPBOX_TOKEN: str = ""

    # External city data feeds
    TRANSIT_GTFS_REALTIME_URL: str = ""
    AQI_API_URL: str = "https://api.openweathermap.org/data/2.5/air_pollution"
    AQI_API_KEY: str = ""
    WEATHER_API_KEY: str = ""

    # AI Models
    IMAGE_MODEL_PATH: str = "ai/image_classifier/mobilenet_v3_issue.tflite"
    NLP_MODEL_NAME: str = "aubmindlab/bert-base-arabertv2"
    NLP_FINE_TUNED_PATH: str = "ai/nlp_assistant/fine_tuned"

    # Issue categories → department routing
    ISSUE_DEPARTMENT_MAP: dict = {
        "pothole": "roads_dept",
        "broken_light": "electricity_dept",
        "illegal_dumping": "sanitation_dept",
        "graffiti": "sanitation_dept",
        "damaged_sign": "roads_dept",
        "tree_hazard": "parks_dept",
        "water_leak": "water_dept",
        "other": "general_dept",
    }

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
