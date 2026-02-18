from datetime import date, datetime

from pydantic import BaseModel


class AppointmentCreate(BaseModel):
    title: str
    appointment_date: date
    vet_provider_id: int | None = None
    clinic: str | None = None
    veterinarian: str | None = None
    reason: str | None = None
    notes: str | None = None
    status: str = "scheduled"


class AppointmentUpdate(BaseModel):
    title: str | None = None
    appointment_date: date | None = None
    vet_provider_id: int | None = None
    clinic: str | None = None
    veterinarian: str | None = None
    reason: str | None = None
    notes: str | None = None
    status: str | None = None


class VetProviderBrief(BaseModel):
    """Minimal vet provider info embedded in appointment responses."""
    id: int
    clinic_name: str
    veterinarian_name: str | None
    phone: str | None

    model_config = {"from_attributes": True}


class AppointmentResponse(BaseModel):
    id: int
    pet_id: int
    vet_provider_id: int | None
    title: str
    appointment_date: datetime
    clinic: str | None
    veterinarian: str | None
    reason: str | None
    notes: str | None
    status: str
    created_at: datetime
    vet_provider: VetProviderBrief | None = None

    model_config = {"from_attributes": True}
