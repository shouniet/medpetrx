from datetime import date, datetime

from pydantic import BaseModel


class WeightEntry(BaseModel):
    date: str
    weight_kg: float


class PetCreate(BaseModel):
    name: str
    species: str
    breed: str | None = None
    dob: date | None = None
    sex: str | None = None
    microchip_num: str | None = None
    insurance: str | None = None


class PetUpdate(BaseModel):
    name: str | None = None
    species: str | None = None
    breed: str | None = None
    dob: date | None = None
    sex: str | None = None
    microchip_num: str | None = None
    insurance: str | None = None


class WeightLogAdd(BaseModel):
    date: str
    weight_kg: float


class PetResponse(BaseModel):
    id: int
    owner_id: int
    name: str
    species: str
    breed: str | None
    dob: datetime | None
    sex: str | None
    weight_log: list | None
    microchip_num: str | None
    insurance: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
