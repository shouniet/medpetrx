from datetime import date, datetime

from pydantic import BaseModel


class ProblemCreate(BaseModel):
    condition_name: str
    is_active: bool = True
    onset_date: date | None = None
    notes: str | None = None


class ProblemUpdate(BaseModel):
    condition_name: str | None = None
    is_active: bool | None = None
    onset_date: date | None = None
    notes: str | None = None


class ProblemResponse(BaseModel):
    id: int
    pet_id: int
    condition_name: str
    is_active: bool
    onset_date: datetime | None
    notes: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
