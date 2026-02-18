from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class VetClinicRef(Base):
    """Reference lookup table of Massachusetts veterinary clinics."""
    __tablename__ = "vet_clinic_refs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    clinic_name: Mapped[str] = mapped_column(String(300), nullable=False, index=True)
    veterinarian_name: Mapped[str | None] = mapped_column(String(200))
    phone: Mapped[str | None] = mapped_column(String(30))
    email: Mapped[str | None] = mapped_column(String(200))
    address: Mapped[str | None] = mapped_column(String(500))
    city: Mapped[str | None] = mapped_column(String(100), index=True)
    state: Mapped[str] = mapped_column(String(2), default="MA", nullable=False)
    zip_code: Mapped[str | None] = mapped_column(String(10))
    website: Mapped[str | None] = mapped_column(String(300))
    specialty: Mapped[str | None] = mapped_column(String(200))
    services: Mapped[str | None] = mapped_column(Text)
    is_emergency: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
