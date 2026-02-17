from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    phone: str | None = None
    first_name: str
    last_name: str
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    secondary_contact_name: str | None = None
    secondary_contact_phone: str | None = None
    secondary_contact_relation: str | None = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserResponse(BaseModel):
    id: int
    email: str
    phone: str | None
    first_name: str | None = None
    last_name: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    secondary_contact_name: str | None = None
    secondary_contact_phone: str | None = None
    secondary_contact_relation: str | None = None
    consent_accepted: bool
    is_admin: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminUserUpdate(BaseModel):
    email: str | None = None
    phone: str | None = None
    password: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    address_line1: str | None = None
    address_line2: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    secondary_contact_name: str | None = None
    secondary_contact_phone: str | None = None
    secondary_contact_relation: str | None = None
    is_admin: bool | None = None
    consent_accepted: bool | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
