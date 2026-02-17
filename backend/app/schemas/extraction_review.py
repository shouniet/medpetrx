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


class ExtractionReviewSubmit(BaseModel):
    medications: list[ReviewedMedication] = []
    vaccines: list[ReviewedVaccine] = []
    allergies: list[ReviewedAllergy] = []
    problems: list[ReviewedProblem] = []


class ConfirmResponse(BaseModel):
    medications_saved: int
    vaccines_saved: int
    allergies_saved: int
    problems_saved: int
    allergy_warnings: list[dict] = []
