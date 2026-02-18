import logging
import traceback
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
import app.models  # noqa: F401 -- ensures all models are registered with SQLAlchemy

logger = logging.getLogger("uvicorn.error")


class ErrorLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except Exception:
            logger.error(
                "Unhandled exception on %s %s:\n%s",
                request.method,
                request.url.path,
                traceback.format_exc(),
            )
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error"},
            )
from app.routers import (
    admin,
    allergies,
    auth,
    common_medications,
    ddi,
    documents,
    emergency,
    extraction_review,
    insurance,
    labs,
    medications,
    pets,
    problems,
    vaccines,
    appointments,
    vitals,
    vet_providers,
    vet_clinic_refs,
    activity_notes,
    dashboard,
    export,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.upload_dir, "pet_images").mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title="MedPetRx API",
    version="1.0.0",
    description="Veterinary medical record hub — Phase 1 MVP",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(ErrorLoggingMiddleware)

# Serve uploaded files (pet images, etc.)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s %s:\n%s", request.method, request.url.path, traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.get("/health")
async def health():
    return {"status": "ok", "service": "MedPetRx API"}


app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(pets.router)
app.include_router(medications.router)
app.include_router(vaccines.router)
app.include_router(problems.router)
app.include_router(allergies.router)
app.include_router(documents.router)
app.include_router(extraction_review.router)
app.include_router(ddi.router)
app.include_router(emergency.router)
app.include_router(labs.router)
app.include_router(insurance.router)
app.include_router(common_medications.router)
app.include_router(appointments.router)
app.include_router(vitals.router)
app.include_router(vet_providers.router)
app.include_router(vet_clinic_refs.router)
app.include_router(activity_notes.router)
app.include_router(dashboard.router)
app.include_router(export.router)
