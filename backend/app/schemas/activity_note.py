from datetime import date, datetime

from pydantic import BaseModel


class ActivityNoteCreate(BaseModel):
    note_date: date
    category: str = "general"
    title: str
    body: str | None = None


class ActivityNoteUpdate(BaseModel):
    note_date: date | None = None
    category: str | None = None
    title: str | None = None
    body: str | None = None


class ActivityNoteResponse(BaseModel):
    id: int
    pet_id: int
    note_date: datetime
    category: str
    title: str
    body: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
