# Import all models here so SQLAlchemy can resolve relationship strings
from app.models.user import User
from app.models.pet import Pet
from app.models.medication import Medication
from app.models.vaccine import Vaccine
from app.models.problem import Problem
from app.models.allergy import Allergy
from app.models.medical_record import MedicalRecord
from app.models.document import Document
from app.models.audit_log import AuditLog
from app.models.emergency_share import EmergencyShare
from app.models.lab import Lab
from app.models.insurance import Insurance
from app.models.common_medication_ref import CommonMedicationRef
from app.models.appointment import Appointment
from app.models.vital import Vital
from app.models.vet_provider import VetProvider
from app.models.activity_note import ActivityNote

__all__ = [
    "User", "Pet", "Medication", "Vaccine", "Problem",
    "Allergy", "MedicalRecord", "Document", "AuditLog", "EmergencyShare", "Lab",
    "Insurance", "CommonMedicationRef", "Appointment", "Vital", "VetProvider", "ActivityNote",
]
