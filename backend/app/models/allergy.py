import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AllergyType(str, enum.Enum):
    DRUG = "Drug"
    FOOD = "Food"
    ENVIRONMENTAL = "Environmental"
    VACCINE = "Vaccine"


class Allergy(Base):
    __tablename__ = "allergies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pet_id: Mapped[int] = mapped_column(Integer, ForeignKey("pets.id"), nullable=False, index=True)
    allergy_type: Mapped[AllergyType] = mapped_column(SAEnum(AllergyType), nullable=False)
    substance_name: Mapped[str] = mapped_column(String(200), nullable=False)
    reaction_desc: Mapped[str | None] = mapped_column(String(1000))
    severity: Mapped[str | None] = mapped_column(String(20))  # Mild / Moderate / Severe
    date_noticed: Mapped[datetime | None] = mapped_column(DateTime)
    vet_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    document_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("documents.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    pet: Mapped["Pet"] = relationship("Pet", back_populates="allergies")  # noqa: F821
    source_document: Mapped["Document | None"] = relationship("Document", foreign_keys=[document_id])  # noqa: F821
