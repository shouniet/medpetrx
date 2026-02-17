from datetime import date, datetime

from pydantic import BaseModel


class VaccineCreate(BaseModel):
    name: str
    date_given: date | None = None
    clinic: str | None = None
    lot_number: str | None = None
    next_due_date: date | None = None
    document_id: int | None = None


class VaccineUpdate(BaseModel):
    name: str | None = None
    date_given: date | None = None
    clinic: str | None = None
    lot_number: str | None = None
    next_due_date: date | None = None


class VaccineResponse(BaseModel):
    id: int
    pet_id: int
    name: str
    date_given: datetime | None
    clinic: str | None
    lot_number: str | None
    next_due_date: datetime | None
    document_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}
