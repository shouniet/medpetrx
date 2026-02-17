from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Insurance(Base):
    __tablename__ = "insurances"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    pet_id: Mapped[int] = mapped_column(Integer, ForeignKey("pets.id"), nullable=False, unique=True, index=True)
    has_insurance: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Provider details
    provider_name: Mapped[str | None] = mapped_column(String(200))
    policy_number: Mapped[str | None] = mapped_column(String(100))
    group_number: Mapped[str | None] = mapped_column(String(100))
    phone: Mapped[str | None] = mapped_column(String(30))

    # Coverage details
    coverage_type: Mapped[str | None] = mapped_column(String(50))  # accident, illness, wellness, comprehensive
    deductible: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    co_pay_percent: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    annual_limit: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    effective_date: Mapped[datetime | None] = mapped_column(DateTime)
    expiration_date: Mapped[datetime | None] = mapped_column(DateTime)

    notes: Mapped[str | None] = mapped_column(String(2000))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    pet: Mapped["Pet"] = relationship("Pet", back_populates="insurance_record")  # noqa: F821
