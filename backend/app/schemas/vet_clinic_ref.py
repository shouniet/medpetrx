from pydantic import BaseModel, Field


class VetClinicRefBase(BaseModel):
    clinic_name: str = Field(..., max_length=300)
    veterinarian_name: str | None = Field(None, max_length=200)
    phone: str | None = Field(None, max_length=30)
    email: str | None = Field(None, max_length=200)
    address: str | None = Field(None, max_length=500)
    city: str | None = Field(None, max_length=100)
    state: str = Field(default="MA", max_length=2)
    zip_code: str | None = Field(None, max_length=10)
    website: str | None = Field(None, max_length=300)
    specialty: str | None = Field(None, max_length=200)
    services: str | None = None
    is_emergency: bool = False


class VetClinicRefCreate(VetClinicRefBase):
    pass


class VetClinicRefUpdate(BaseModel):
    clinic_name: str | None = Field(None, max_length=300)
    veterinarian_name: str | None = Field(None, max_length=200)
    phone: str | None = Field(None, max_length=30)
    email: str | None = Field(None, max_length=200)
    address: str | None = Field(None, max_length=500)
    city: str | None = Field(None, max_length=100)
    state: str | None = Field(None, max_length=2)
    zip_code: str | None = Field(None, max_length=10)
    website: str | None = Field(None, max_length=300)
    specialty: str | None = Field(None, max_length=200)
    services: str | None = None
    is_emergency: bool | None = None
    is_active: bool | None = None


class VetClinicRefOut(VetClinicRefBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True
