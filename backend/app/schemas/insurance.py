from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel


class CoverageType(str, Enum):
    accident = "accident"
    illness = "illness"
    wellness = "wellness"
    comprehensive = "comprehensive"


COVERAGE_TYPE_LABELS = {
    "accident": "Accident Only",
    "illness": "Illness Only",
    "wellness": "Wellness / Preventive",
    "comprehensive": "Comprehensive",
}


class InsuranceCreate(BaseModel):
    has_insurance: bool = False
    provider_name: str | None = None
    policy_number: str | None = None
    group_number: str | None = None
    phone: str | None = None
    coverage_type: str | None = None
    deductible: Decimal | None = None
    co_pay_percent: Decimal | None = None
    annual_limit: Decimal | None = None
    effective_date: date | None = None
    expiration_date: date | None = None
    notes: str | None = None


class InsuranceUpdate(InsuranceCreate):
    pass


class InsuranceResponse(BaseModel):
    id: int
    pet_id: int
    has_insurance: bool
    provider_name: str | None
    policy_number: str | None
    group_number: str | None
    phone: str | None
    coverage_type: str | None
    deductible: Decimal | None
    co_pay_percent: Decimal | None
    annual_limit: Decimal | None
    effective_date: datetime | None
    expiration_date: datetime | None
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
