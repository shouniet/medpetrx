from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Lab(Base):
    __tablename__ = "labs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pet_id: Mapped[int] = mapped_column(Integer, ForeignKey("pets.id"), nullable=False, index=True)
    lab_type: Mapped[str] = mapped_column(String(50), nullable=False)  # chemistry, electrolytes, cbc, nsaid_screen, urinalysis, thyroid, other
    lab_date: Mapped[datetime | None] = mapped_column(DateTime)
    veterinarian: Mapped[str | None] = mapped_column(String(200))
    clinic: Mapped[str | None] = mapped_column(String(200))
    results: Mapped[dict | None] = mapped_column(JSON)  # flexible key-value lab values
    notes: Mapped[str | None] = mapped_column(String(2000))
    document_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("documents.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    pet: Mapped["Pet"] = relationship("Pet", back_populates="labs")  # noqa: F821
    source_document: Mapped["Document | None"] = relationship("Document", foreign_keys=[document_id])  # noqa: F821
