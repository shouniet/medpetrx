from datetime import date, datetime

from pydantic import BaseModel


class AppointmentCreate(BaseModel):
    title: str
    appointment_date: date
    clinic: str | None = None
    veterinarian: str | None = None
    reason: str | None = None
    notes: str | None = None
    status: str = "scheduled"


class AppointmentUpdate(BaseModel):
    title: str | None = None
    appointment_date: date | None = None
    clinic: str | None = None
    veterinarian: str | None = None
    reason: str | None = None
    notes: str | None = None
    status: str | None = None


class AppointmentResponse(BaseModel):
    id: int
    pet_id: int
    title: str
    appointment_date: datetime
    clinic: str | None
    veterinarian: str | None
    reason: str | None
    notes: str | None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
