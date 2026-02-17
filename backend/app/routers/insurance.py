from datetime import datetime

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_consented_user
from app.models.insurance import Insurance
from app.models.pet import Pet
from app.models.user import User
from app.routers.pets import get_pet_for_owner
from app.schemas.insurance import (
    COVERAGE_TYPE_LABELS,
    InsuranceCreate,
    InsuranceResponse,
    InsuranceUpdate,
)
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/pets/{pet_id}/insurance", tags=["insurance"])


def _to_dt(d) -> datetime | None:
    if d is None:
        return None
    if isinstance(d, datetime):
        return d
    return datetime.combine(d, datetime.min.time())


@router.get("/coverage-types")
async def get_coverage_types():
    """Return the available coverage type labels."""
    return {"coverage_types": COVERAGE_TYPE_LABELS}


@router.get("", response_model=InsuranceResponse | None)
async def get_insurance(
    pet_id: int,
    pet: Pet = Depends(get_pet_for_owner),
    db: AsyncSession = Depends(get_db),
):
    """Get the insurance record for a pet (returns null if none exists)."""
    result = await db.execute(select(Insurance).where(Insurance.pet_id == pet_id))
    record = result.scalar_one_or_none()
    return record


@router.put("", response_model=InsuranceResponse)
async def upsert_insurance(
    pet_id: int,
    data: InsuranceCreate,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    """Create or update the insurance record for a pet."""
    result = await db.execute(select(Insurance).where(Insurance.pet_id == pet_id))
    record = result.scalar_one_or_none()

    if record is None:
        record = Insurance(
            pet_id=pet_id,
            has_insurance=data.has_insurance,
            provider_name=data.provider_name,
            policy_number=data.policy_number,
            group_number=data.group_number,
            phone=data.phone,
            coverage_type=data.coverage_type,
            deductible=data.deductible,
            co_pay_percent=data.co_pay_percent,
            annual_limit=data.annual_limit,
            effective_date=_to_dt(data.effective_date),
            expiration_date=_to_dt(data.expiration_date),
            notes=data.notes,
        )
        db.add(record)
        action = "insurance_created"
    else:
        record.has_insurance = data.has_insurance
        record.provider_name = data.provider_name
        record.policy_number = data.policy_number
        record.group_number = data.group_number
        record.phone = data.phone
        record.coverage_type = data.coverage_type
        record.deductible = data.deductible
        record.co_pay_percent = data.co_pay_percent
        record.annual_limit = data.annual_limit
        record.effective_date = _to_dt(data.effective_date)
        record.expiration_date = _to_dt(data.expiration_date)
        record.notes = data.notes
        record.updated_at = datetime.utcnow()
        action = "insurance_updated"

    await db.commit()
    await db.refresh(record)

    await create_audit_log(db, user.id, action, request.client.host if request.client else "unknown")

    return record
