from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))

    # Owner profile
    first_name: Mapped[str | None] = mapped_column(String(100))
    last_name: Mapped[str | None] = mapped_column(String(100))
    address_line1: Mapped[str | None] = mapped_column(String(255))
    address_line2: Mapped[str | None] = mapped_column(String(255))
    city: Mapped[str | None] = mapped_column(String(100))
    state: Mapped[str | None] = mapped_column(String(50))
    zip_code: Mapped[str | None] = mapped_column(String(20))

    # Secondary contact / co-owner
    secondary_contact_name: Mapped[str | None] = mapped_column(String(200))
    secondary_contact_phone: Mapped[str | None] = mapped_column(String(20))
    secondary_contact_relation: Mapped[str | None] = mapped_column(String(100))

    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_accepted: Mapped[bool] = mapped_column(Boolean, default=False)
    consent_date: Mapped[datetime | None] = mapped_column(DateTime)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    pets: Mapped[list["Pet"]] = relationship("Pet", back_populates="owner")  # noqa: F821
    audit_logs: Mapped[list["AuditLog"]] = relationship("AuditLog", back_populates="user")  # noqa: F821
    vet_providers: Mapped[list["VetProvider"]] = relationship("VetProvider", back_populates="owner")  # noqa: F821
