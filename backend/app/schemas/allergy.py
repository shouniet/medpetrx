from datetime import date, datetime

from pydantic import BaseModel

from app.models.allergy import AllergyType


class AllergyCreate(BaseModel):
    allergy_type: AllergyType
    substance_name: str
    reaction_desc: str | None = None
    severity: str | None = None  # Mild / Moderate / Severe
    date_noticed: date | None = None
    vet_verified: bool = False
    document_id: int | None = None


class AllergyUpdate(BaseModel):
    allergy_type: AllergyType | None = None
    substance_name: str | None = None
    reaction_desc: str | None = None
    severity: str | None = None
    date_noticed: date | None = None
    vet_verified: bool | None = None


class AllergyResponse(BaseModel):
    id: int
    pet_id: int
    allergy_type: str
    substance_name: str
    reaction_desc: str | None
    severity: str | None
    date_noticed: datetime | None
    vet_verified: bool
    document_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}
