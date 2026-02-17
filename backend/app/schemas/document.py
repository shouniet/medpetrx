from datetime import datetime

from pydantic import BaseModel

from app.models.document import ExtractionStatus


class DocumentResponse(BaseModel):
    id: int
    pet_id: int
    filename: str
    upload_date: datetime
    extraction_status: ExtractionStatus
    extracted_data: dict | None

    model_config = {"from_attributes": True}
