from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_consented_user
from app.models.pet import Pet
from app.models.user import User
from app.models.vaccine import Vaccine
from app.routers.pets import get_pet_for_owner
from app.schemas.vaccine import VaccineCreate, VaccineResponse, VaccineUpdate
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/pets/{pet_id}/vaccines", tags=["vaccines"])


def _to_dt(d) -> datetime | None:
    if d is None:
        return None
    if isinstance(d, datetime):
        return d
    return datetime.combine(d, datetime.min.time())


@router.get("", response_model=list[VaccineResponse])
async def list_vaccines(
    pet_id: int,
    pet: Pet = Depends(get_pet_for_owner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Vaccine).where(Vaccine.pet_id == pet_id))
    return result.scalars().all()


@router.post("", response_model=VaccineResponse, status_code=status.HTTP_201_CREATED)
async def create_vaccine(
    pet_id: int,
    data: VaccineCreate,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    vaccine = Vaccine(
        pet_id=pet_id,
        name=data.name,
        date_given=_to_dt(data.date_given),
        clinic=data.clinic,
        lot_number=data.lot_number,
        next_due_date=_to_dt(data.next_due_date),
        document_id=data.document_id,
    )
    db.add(vaccine)
    await db.commit()
    await db.refresh(vaccine)
    await create_audit_log(db, user_id=user.id, action="CREATE_VACCINE", resource_type="Vaccine", resource_id=vaccine.id, ip_address=request.client.host if request.client else None)
    return VaccineResponse.model_validate(vaccine)


@router.put("/{vaccine_id}", response_model=VaccineResponse)
async def update_vaccine(
    pet_id: int,
    vaccine_id: int,
    updates: VaccineUpdate,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Vaccine).where(Vaccine.id == vaccine_id, Vaccine.pet_id == pet_id))
    vaccine = result.scalar_one_or_none()
    if vaccine is None:
        raise HTTPException(status_code=404, detail="Vaccine not found")
    for field, value in updates.model_dump(exclude_none=True).items():
        if field in ("date_given", "next_due_date"):
            value = _to_dt(value)
        setattr(vaccine, field, value)
    await db.commit()
    await db.refresh(vaccine)
    await create_audit_log(db, user_id=user.id, action="UPDATE_VACCINE", resource_type="Vaccine", resource_id=vaccine.id, ip_address=request.client.host if request.client else None)
    return VaccineResponse.model_validate(vaccine)


@router.delete("/{vaccine_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vaccine(
    pet_id: int,
    vaccine_id: int,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Vaccine).where(Vaccine.id == vaccine_id, Vaccine.pet_id == pet_id))
    vaccine = result.scalar_one_or_none()
    if vaccine is None:
        raise HTTPException(status_code=404, detail="Vaccine not found")
    await db.delete(vaccine)
    await db.commit()
    await create_audit_log(db, user_id=user.id, action="DELETE_VACCINE", resource_type="Vaccine", resource_id=vaccine_id, ip_address=request.client.host if request.client else None)
