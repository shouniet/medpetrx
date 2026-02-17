from datetime import date, datetime

from pydantic import BaseModel


class MedicationCreate(BaseModel):
    drug_name: str
    strength: str | None = None
    directions: str | None = None
    indication: str | None = None
    start_date: date | None = None
    stop_date: date | None = None
    prescriber: str | None = None
    pharmacy: str | None = None
    is_active: bool = True
    document_id: int | None = None
    refill_reminder_date: date | None = None


class MedicationUpdate(BaseModel):
    drug_name: str | None = None
    strength: str | None = None
    directions: str | None = None
    indication: str | None = None
    start_date: date | None = None
    stop_date: date | None = None
    prescriber: str | None = None
    pharmacy: str | None = None
    is_active: bool | None = None
    refill_reminder_date: date | None = None


class AllergyBrief(BaseModel):
    id: int
    substance_name: str
    allergy_type: str
    severity: str | None
    reaction_desc: str | None

    model_config = {"from_attributes": True}


class MedicationResponse(BaseModel):
    id: int
    pet_id: int
    drug_name: str
    strength: str | None
    directions: str | None
    indication: str | None
    start_date: datetime | None
    stop_date: datetime | None
    prescriber: str | None
    pharmacy: str | None
    is_active: bool
    document_id: int | None
    refill_reminder_date: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class MedicationCreateResponse(BaseModel):
    medication: MedicationResponse
    allergy_warnings: list[AllergyBrief] = []


class AllergyCheckRequest(BaseModel):
    drug_name: str


class AllergyCheckResponse(BaseModel):
    allergy_matches: list[AllergyBrief]
