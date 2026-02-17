from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel


class LabType(str, Enum):
    chemistry = "chemistry"
    electrolytes = "electrolytes"
    cbc = "cbc"
    nsaid_screen = "nsaid_screen"
    urinalysis = "urinalysis"
    thyroid = "thyroid"
    other = "other"


# ── Common reference-range templates (informational) ─────────────────────
# Callers can use these to pre-populate forms
LAB_TEMPLATES: dict[str, list[dict]] = {
    "chemistry": [
        {"key": "bun", "label": "BUN", "unit": "mg/dL"},
        {"key": "creatinine", "label": "Creatinine", "unit": "mg/dL"},
        {"key": "alt", "label": "ALT (SGPT)", "unit": "U/L"},
        {"key": "ast", "label": "AST (SGOT)", "unit": "U/L"},
        {"key": "alp", "label": "ALP", "unit": "U/L"},
        {"key": "total_protein", "label": "Total Protein", "unit": "g/dL"},
        {"key": "albumin", "label": "Albumin", "unit": "g/dL"},
        {"key": "globulin", "label": "Globulin", "unit": "g/dL"},
        {"key": "glucose", "label": "Glucose", "unit": "mg/dL"},
        {"key": "bilirubin", "label": "Total Bilirubin", "unit": "mg/dL"},
        {"key": "cholesterol", "label": "Cholesterol", "unit": "mg/dL"},
        {"key": "amylase", "label": "Amylase", "unit": "U/L"},
        {"key": "lipase", "label": "Lipase", "unit": "U/L"},
    ],
    "electrolytes": [
        {"key": "sodium", "label": "Sodium (Na)", "unit": "mEq/L"},
        {"key": "potassium", "label": "Potassium (K)", "unit": "mEq/L"},
        {"key": "chloride", "label": "Chloride (Cl)", "unit": "mEq/L"},
        {"key": "calcium", "label": "Calcium (Ca)", "unit": "mg/dL"},
        {"key": "phosphorus", "label": "Phosphorus", "unit": "mg/dL"},
        {"key": "magnesium", "label": "Magnesium", "unit": "mg/dL"},
        {"key": "bicarbonate", "label": "Bicarbonate (HCO3)", "unit": "mEq/L"},
    ],
    "cbc": [
        {"key": "wbc", "label": "WBC", "unit": "×10³/µL"},
        {"key": "rbc", "label": "RBC", "unit": "×10⁶/µL"},
        {"key": "hemoglobin", "label": "Hemoglobin", "unit": "g/dL"},
        {"key": "hematocrit", "label": "Hematocrit", "unit": "%"},
        {"key": "platelets", "label": "Platelets", "unit": "×10³/µL"},
        {"key": "neutrophils", "label": "Neutrophils", "unit": "×10³/µL"},
        {"key": "lymphocytes", "label": "Lymphocytes", "unit": "×10³/µL"},
        {"key": "monocytes", "label": "Monocytes", "unit": "×10³/µL"},
        {"key": "eosinophils", "label": "Eosinophils", "unit": "×10³/µL"},
        {"key": "basophils", "label": "Basophils", "unit": "×10³/µL"},
        {"key": "mcv", "label": "MCV", "unit": "fL"},
        {"key": "mch", "label": "MCH", "unit": "pg"},
        {"key": "mchc", "label": "MCHC", "unit": "g/dL"},
    ],
    "nsaid_screen": [
        {"key": "bun", "label": "BUN", "unit": "mg/dL"},
        {"key": "creatinine", "label": "Creatinine", "unit": "mg/dL"},
        {"key": "alt", "label": "ALT (SGPT)", "unit": "U/L"},
        {"key": "alp", "label": "ALP", "unit": "U/L"},
        {"key": "total_protein", "label": "Total Protein", "unit": "g/dL"},
        {"key": "urine_specific_gravity", "label": "Urine Specific Gravity", "unit": ""},
        {"key": "urine_protein", "label": "Urine Protein", "unit": ""},
    ],
    "urinalysis": [
        {"key": "specific_gravity", "label": "Specific Gravity", "unit": ""},
        {"key": "ph", "label": "pH", "unit": ""},
        {"key": "protein", "label": "Protein", "unit": ""},
        {"key": "glucose", "label": "Glucose", "unit": ""},
        {"key": "ketones", "label": "Ketones", "unit": ""},
        {"key": "bilirubin", "label": "Bilirubin", "unit": ""},
        {"key": "blood", "label": "Blood / Hemoglobin", "unit": ""},
        {"key": "wbc", "label": "WBC", "unit": "/hpf"},
        {"key": "rbc", "label": "RBC", "unit": "/hpf"},
        {"key": "bacteria", "label": "Bacteria", "unit": ""},
        {"key": "crystals", "label": "Crystals", "unit": ""},
        {"key": "casts", "label": "Casts", "unit": "/lpf"},
    ],
    "thyroid": [
        {"key": "t4", "label": "Total T4", "unit": "µg/dL"},
        {"key": "free_t4", "label": "Free T4", "unit": "ng/dL"},
        {"key": "tsh", "label": "TSH", "unit": "ng/mL"},
    ],
}


class LabCreate(BaseModel):
    lab_type: LabType
    lab_date: date | None = None
    veterinarian: str | None = None
    clinic: str | None = None
    results: dict | None = None
    notes: str | None = None
    document_id: int | None = None


class LabUpdate(BaseModel):
    lab_type: LabType | None = None
    lab_date: date | None = None
    veterinarian: str | None = None
    clinic: str | None = None
    results: dict | None = None
    notes: str | None = None


class LabResponse(BaseModel):
    id: int
    pet_id: int
    lab_type: str
    lab_date: datetime | None
    veterinarian: str | None
    clinic: str | None
    results: dict | None
    notes: str | None
    document_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class LabTemplateField(BaseModel):
    key: str
    label: str
    unit: str


class LabTemplatesResponse(BaseModel):
    templates: dict[str, list[LabTemplateField]]
