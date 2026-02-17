from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Pet(Base):
    __tablename__ = "pets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    species: Mapped[str] = mapped_column(String(50), nullable=False)
    breed: Mapped[str | None] = mapped_column(String(100))
    dob: Mapped[datetime | None] = mapped_column(DateTime)
    sex: Mapped[str | None] = mapped_column(String(10))
    weight_log: Mapped[list | None] = mapped_column(JSON)  # [{date, weight_kg}, ...]
    microchip_num: Mapped[str | None] = mapped_column(String(50), unique=True, index=True)
    insurance: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    owner: Mapped["User"] = relationship("User", back_populates="pets")  # noqa: F821
    medications: Mapped[list["Medication"]] = relationship("Medication", back_populates="pet", cascade="all, delete-orphan")  # noqa: F821
    vaccines: Mapped[list["Vaccine"]] = relationship("Vaccine", back_populates="pet", cascade="all, delete-orphan")  # noqa: F821
    problems: Mapped[list["Problem"]] = relationship("Problem", back_populates="pet", cascade="all, delete-orphan")  # noqa: F821
    allergies: Mapped[list["Allergy"]] = relationship("Allergy", back_populates="pet", cascade="all, delete-orphan")  # noqa: F821
    medical_records: Mapped[list["MedicalRecord"]] = relationship("MedicalRecord", back_populates="pet", cascade="all, delete-orphan")  # noqa: F821
    documents: Mapped[list["Document"]] = relationship("Document", back_populates="pet", cascade="all, delete-orphan")  # noqa: F821
    emergency_shares: Mapped[list["EmergencyShare"]] = relationship("EmergencyShare", back_populates="pet", cascade="all, delete-orphan")  # noqa: F821
    labs: Mapped[list["Lab"]] = relationship("Lab", back_populates="pet", cascade="all, delete-orphan")  # noqa: F821
    insurance_record: Mapped["Insurance | None"] = relationship("Insurance", back_populates="pet", uselist=False, cascade="all, delete-orphan")  # noqa: F821
    appointments: Mapped[list["Appointment"]] = relationship("Appointment", back_populates="pet", cascade="all, delete-orphan")  # noqa: F821
    vitals: Mapped[list["Vital"]] = relationship("Vital", back_populates="pet", cascade="all, delete-orphan")  # noqa: F821
    activity_notes: Mapped[list["ActivityNote"]] = relationship("ActivityNote", back_populates="pet", cascade="all, delete-orphan")  # noqa: F821
