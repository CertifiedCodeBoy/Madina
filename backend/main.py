from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import assistant, energy, issues, transit

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Madina Smart City — unified citizen services API.\n\n"
        "Modules: Issue Reporting (AI triage) · Transit & AQI · "
        "Energy Dashboard · Multimodal Mobility · AI Municipal Assistant."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for issue report uploads
import os
os.makedirs("uploads/issues", exist_ok=True)
app.mount("/static/issues", StaticFiles(directory="uploads/issues"), name="issue_uploads")

# Register routers
app.include_router(issues.router, prefix="/api/v1")
app.include_router(transit.router, prefix="/api/v1")
app.include_router(energy.router, prefix="/api/v1")
app.include_router(assistant.router, prefix="/api/v1")


@app.get("/", tags=["Health"])
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "operational",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok"}
