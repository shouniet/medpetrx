from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Appointment(Base):
    """Vet appointments — past and upcoming."""
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pet_id: Mapped[int] = mapped_column(Integer, ForeignKey("pets.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    appointment_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    clinic: Mapped[str | None] = mapped_column(String(200))
    veterinarian: Mapped[str | None] = mapped_column(String(200))
    reason: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="scheduled")  # scheduled, completed, cancelled
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    pet: Mapped["Pet"] = relationship("Pet", back_populates="appointments")  # noqa: F821
