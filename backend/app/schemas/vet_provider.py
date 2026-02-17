from datetime import datetime

from pydantic import BaseModel


class VetProviderCreate(BaseModel):
    clinic_name: str
    veterinarian_name: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    website: str | None = None
    specialty: str | None = None
    notes: str | None = None
    is_primary: bool = False


class VetProviderUpdate(BaseModel):
    clinic_name: str | None = None
    veterinarian_name: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    website: str | None = None
    specialty: str | None = None
    notes: str | None = None
    is_primary: bool | None = None


class VetProviderResponse(BaseModel):
    id: int
    owner_id: int
    clinic_name: str
    veterinarian_name: str | None
    phone: str | None
    email: str | None
    address: str | None
    website: str | None
    specialty: str | None
    notes: str | None
    is_primary: bool
    created_at: datetime

    model_config = {"from_attributes": True}
