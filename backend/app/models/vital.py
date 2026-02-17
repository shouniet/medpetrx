from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Vital(Base):
    """Weight & vitals tracking over time."""
    __tablename__ = "vitals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pet_id: Mapped[int] = mapped_column(Integer, ForeignKey("pets.id"), nullable=False, index=True)
    recorded_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    weight_kg: Mapped[float | None] = mapped_column(Float)
    weight_lbs: Mapped[float | None] = mapped_column(Float)
    temperature_f: Mapped[float | None] = mapped_column(Float)
    heart_rate_bpm: Mapped[int | None] = mapped_column(Integer)
    respiratory_rate: Mapped[int | None] = mapped_column(Integer)
    notes: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    pet: Mapped["Pet"] = relationship("Pet", back_populates="vitals")  # noqa: F821
