from datetime import date, datetime

from pydantic import BaseModel


class VitalCreate(BaseModel):
    recorded_date: date
    weight_kg: float | None = None
    weight_lbs: float | None = None
    temperature_f: float | None = None
    heart_rate_bpm: int | None = None
    respiratory_rate: int | None = None
    notes: str | None = None


class VitalUpdate(BaseModel):
    recorded_date: date | None = None
    weight_kg: float | None = None
    weight_lbs: float | None = None
    temperature_f: float | None = None
    heart_rate_bpm: int | None = None
    respiratory_rate: int | None = None
    notes: str | None = None


class VitalResponse(BaseModel):
    id: int
    pet_id: int
    recorded_date: datetime
    weight_kg: float | None
    weight_lbs: float | None
    temperature_f: float | None
    heart_rate_bpm: int | None
    respiratory_rate: int | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
