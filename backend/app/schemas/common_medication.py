from pydantic import BaseModel, Field


class CommonMedicationBase(BaseModel):
    drug_name: str = Field(..., max_length=200)
    drug_class: str = Field(..., max_length=100)
    species: list[str] = Field(..., description='e.g. ["dog"], ["cat"], ["dog","cat"]')
    common_indications: str = Field(..., max_length=500)
    typical_dose: str | None = Field(None, max_length=500)
    route: str | None = Field(None, max_length=200)
    common_side_effects: list[str] = Field(default_factory=list)
    warnings: str | None = Field(None, max_length=2000)


class CommonMedicationCreate(CommonMedicationBase):
    pass


class CommonMedicationUpdate(BaseModel):
    drug_name: str | None = Field(None, max_length=200)
    drug_class: str | None = Field(None, max_length=100)
    species: list[str] | None = None
    common_indications: str | None = Field(None, max_length=500)
    typical_dose: str | None = Field(None, max_length=500)
    route: str | None = Field(None, max_length=200)
    common_side_effects: list[str] | None = None
    warnings: str | None = Field(None, max_length=2000)


class CommonMedicationOut(CommonMedicationBase):
    id: int

    class Config:
        from_attributes = True
