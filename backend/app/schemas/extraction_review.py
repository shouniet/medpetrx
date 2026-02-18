import enum
from datetime import date

from pydantic import BaseModel


class FieldDecision(str, enum.Enum):
    APPROVED = "approved"
    EDITED = "edited"
    REJECTED = "rejected"


class ReviewedMedication(BaseModel):
    decision: FieldDecision
    drug_name: str
    strength: str | None = None
    directions: str | None = None
    indication: str | None = None
    start_date: date | None = None
    stop_date: date | None = None
    prescriber: str | None = None
    pharmacy: str | None = None


class ReviewedVaccine(BaseModel):
    decision: FieldDecision
    name: str
    date_given: date | None = None
    clinic: str | None = None
    lot_number: str | None = None
    next_due_date: date | None = None


class ReviewedAllergy(BaseModel):
    decision: FieldDecision
    substance_name: str
    allergy_type: str = "Drug"
    reaction_desc: str | None = None
    severity: str | None = None


class ReviewedProblem(BaseModel):
    decision: FieldDecision
    condition_name: str
    onset_date: date | None = None
    is_active: bool = True
    notes: str | None = None


class ReviewedVital(BaseModel):
    decision: FieldDecision
    recorded_date: date | None = None
    weight_kg: float | None = None
    weight_lbs: float | None = None
    temperature_f: float | None = None
    heart_rate_bpm: int | None = None
    respiratory_rate: int | None = None
    notes: str | None = None


class ExtractionReviewSubmit(BaseModel):
    medications: list[ReviewedMedication] = []
    vaccines: list[ReviewedVaccine] = []
    allergies: list[ReviewedAllergy] = []
    problems: list[ReviewedProblem] = []
    vitals: list[ReviewedVital] = []


class ConfirmResponse(BaseModel):
    medications_saved: int
    vaccines_saved: int
    allergies_saved: int
    problems_saved: int
    vitals_saved: int = 0
    allergy_warnings: list[dict] = []
