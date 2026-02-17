from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Medication(Base):
    __tablename__ = "medications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pet_id: Mapped[int] = mapped_column(Integer, ForeignKey("pets.id"), nullable=False, index=True)
    drug_name: Mapped[str] = mapped_column(String(200), nullable=False)
    strength: Mapped[str | None] = mapped_column(String(100))
    directions: Mapped[str | None] = mapped_column(String(500))
    indication: Mapped[str | None] = mapped_column(String(500))
    start_date: Mapped[datetime | None] = mapped_column(DateTime)
    stop_date: Mapped[datetime | None] = mapped_column(DateTime)
    prescriber: Mapped[str | None] = mapped_column(String(200))
    pharmacy: Mapped[str | None] = mapped_column(String(200))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    document_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("documents.id"), nullable=True)
    refill_reminder_date: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    pet: Mapped["Pet"] = relationship("Pet", back_populates="medications")  # noqa: F821
    source_document: Mapped["Document | None"] = relationship("Document", foreign_keys=[document_id])  # noqa: F821
