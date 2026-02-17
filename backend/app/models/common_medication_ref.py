from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CommonMedicationRef(Base):
    """Reference table of common veterinary medications (admin-managed)."""
    __tablename__ = "common_medication_refs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    drug_name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True, index=True)
    drug_class: Mapped[str] = mapped_column(String(100), nullable=False)
    species: Mapped[list] = mapped_column(JSON, nullable=False, default=list)  # ["dog"], ["cat"], ["dog","cat"]
    common_indications: Mapped[str] = mapped_column(String(500), nullable=False)
    typical_dose: Mapped[str | None] = mapped_column(String(500))
    route: Mapped[str | None] = mapped_column(String(200))
    common_side_effects: Mapped[list] = mapped_column(JSON, nullable=False, default=list)  # ["Vomiting", ...]
    warnings: Mapped[str | None] = mapped_column(String(2000))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
