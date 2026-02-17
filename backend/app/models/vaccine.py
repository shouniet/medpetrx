from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Vaccine(Base):
    __tablename__ = "vaccines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pet_id: Mapped[int] = mapped_column(Integer, ForeignKey("pets.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    date_given: Mapped[datetime | None] = mapped_column(DateTime)
    clinic: Mapped[str | None] = mapped_column(String(200))
    lot_number: Mapped[str | None] = mapped_column(String(100))
    next_due_date: Mapped[datetime | None] = mapped_column(DateTime)
    document_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("documents.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    pet: Mapped["Pet"] = relationship("Pet", back_populates="vaccines")  # noqa: F821
    source_document: Mapped["Document | None"] = relationship("Document", foreign_keys=[document_id])  # noqa: F821
