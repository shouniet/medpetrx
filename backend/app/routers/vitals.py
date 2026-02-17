from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_consented_user
from app.models.pet import Pet
from app.models.user import User
from app.models.vital import Vital
from app.routers.pets import get_pet_for_owner
from app.schemas.vital import VitalCreate, VitalResponse, VitalUpdate
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/pets/{pet_id}/vitals", tags=["vitals"])


def _to_dt(d) -> datetime | None:
    if d is None:
        return None
    if isinstance(d, datetime):
        return d
    return datetime.combine(d, datetime.min.time())


@router.get("", response_model=list[VitalResponse])
async def list_vitals(
    pet_id: int,
    pet: Pet = Depends(get_pet_for_owner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Vital)
        .where(Vital.pet_id == pet_id)
        .order_by(Vital.recorded_date.desc())
    )
    return result.scalars().all()


@router.post("", response_model=VitalResponse, status_code=status.HTTP_201_CREATED)
async def create_vital(
    pet_id: int,
    data: VitalCreate,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    # Auto-convert between kg and lbs
    weight_kg = data.weight_kg
    weight_lbs = data.weight_lbs
    if weight_kg and not weight_lbs:
        weight_lbs = round(weight_kg * 2.20462, 2)
    elif weight_lbs and not weight_kg:
        weight_kg = round(weight_lbs / 2.20462, 2)

    vital = Vital(
        pet_id=pet_id,
        recorded_date=_to_dt(data.recorded_date),
        weight_kg=weight_kg,
        weight_lbs=weight_lbs,
        temperature_f=data.temperature_f,
        heart_rate_bpm=data.heart_rate_bpm,
        respiratory_rate=data.respiratory_rate,
        notes=data.notes,
    )
    db.add(vital)
    await db.commit()
    await db.refresh(vital)
    await create_audit_log(db, user_id=user.id, action="CREATE_VITAL", resource_type="Vital", resource_id=vital.id, ip_address=request.client.host if request.client else None)
    return vital


@router.put("/{vital_id}", response_model=VitalResponse)
async def update_vital(
    pet_id: int,
    vital_id: int,
    updates: VitalUpdate,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Vital).where(Vital.id == vital_id, Vital.pet_id == pet_id))
    vital = result.scalar_one_or_none()
    if not vital:
        raise HTTPException(status_code=404, detail="Vital record not found")
    update_data = updates.model_dump(exclude_unset=True)
    if "recorded_date" in update_data:
        update_data["recorded_date"] = _to_dt(update_data["recorded_date"])
    # Auto-convert between kg and lbs
    if "weight_kg" in update_data and update_data["weight_kg"] and "weight_lbs" not in update_data:
        update_data["weight_lbs"] = round(update_data["weight_kg"] * 2.20462, 2)
    elif "weight_lbs" in update_data and update_data["weight_lbs"] and "weight_kg" not in update_data:
        update_data["weight_kg"] = round(update_data["weight_lbs"] / 2.20462, 2)
    for field, value in update_data.items():
        setattr(vital, field, value)
    await db.commit()
    await db.refresh(vital)
    await create_audit_log(db, user_id=user.id, action="UPDATE_VITAL", resource_type="Vital", resource_id=vital.id, ip_address=request.client.host if request.client else None)
    return vital


@router.delete("/{vital_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vital(
    pet_id: int,
    vital_id: int,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Vital).where(Vital.id == vital_id, Vital.pet_id == pet_id))
    vital = result.scalar_one_or_none()
    if not vital:
        raise HTTPException(status_code=404, detail="Vital record not found")
    await db.delete(vital)
    await db.commit()
