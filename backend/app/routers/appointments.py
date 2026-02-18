from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_consented_user
from app.models.appointment import Appointment
from app.models.pet import Pet
from app.models.user import User
from app.models.vet_provider import VetProvider
from app.routers.pets import get_pet_for_owner
from app.schemas.appointment import AppointmentCreate, AppointmentResponse, AppointmentUpdate
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/pets/{pet_id}/appointments", tags=["appointments"])


def _to_dt(d) -> datetime | None:
    if d is None:
        return None
    if isinstance(d, datetime):
        return d
    return datetime.combine(d, datetime.min.time())


async def _resolve_vet_provider(db: AsyncSession, vet_provider_id: int | None, user_id: int) -> VetProvider | None:
    """Look up the vet provider and verify it belongs to this user."""
    if not vet_provider_id:
        return None
    result = await db.execute(
        select(VetProvider).where(VetProvider.id == vet_provider_id, VetProvider.owner_id == user_id)
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Vet provider not found")
    return provider


@router.get("", response_model=list[AppointmentResponse])
async def list_appointments(
    pet_id: int,
    pet: Pet = Depends(get_pet_for_owner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Appointment)
        .where(Appointment.pet_id == pet_id)
        .order_by(Appointment.appointment_date.desc())
    )
    return result.scalars().all()


@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    pet_id: int,
    data: AppointmentCreate,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    provider = await _resolve_vet_provider(db, data.vet_provider_id, user.id)
    clinic = data.clinic or (provider.clinic_name if provider else None)
    veterinarian = data.veterinarian or (provider.veterinarian_name if provider else None)

    appt = Appointment(
        pet_id=pet_id,
        vet_provider_id=data.vet_provider_id,
        title=data.title,
        appointment_date=_to_dt(data.appointment_date),
        clinic=clinic,
        veterinarian=veterinarian,
        reason=data.reason,
        notes=data.notes,
        status=data.status,
    )
    db.add(appt)
    await db.commit()
    await db.refresh(appt)
    await create_audit_log(db, user_id=user.id, action="CREATE_APPOINTMENT", resource_type="Appointment", resource_id=appt.id, ip_address=request.client.host if request.client else None)
    return appt


@router.put("/{appt_id}", response_model=AppointmentResponse)
async def update_appointment(
    pet_id: int,
    appt_id: int,
    updates: AppointmentUpdate,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Appointment).where(Appointment.id == appt_id, Appointment.pet_id == pet_id))
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    update_data = updates.model_dump(exclude_unset=True)

    # If vet_provider_id is being changed, resolve provider and auto-fill clinic/vet
    if "vet_provider_id" in update_data:
        provider = await _resolve_vet_provider(db, update_data["vet_provider_id"], user.id)
        appt.vet_provider_id = update_data.pop("vet_provider_id")
        if provider:
            if "clinic" not in update_data:
                appt.clinic = provider.clinic_name
            if "veterinarian" not in update_data:
                appt.veterinarian = provider.veterinarian_name

    for field, value in update_data.items():
        if field == "appointment_date":
            value = _to_dt(value)
        setattr(appt, field, value)
    await db.commit()
    await db.refresh(appt)
    await create_audit_log(db, user_id=user.id, action="UPDATE_APPOINTMENT", resource_type="Appointment", resource_id=appt.id, ip_address=request.client.host if request.client else None)
    return appt


@router.delete("/{appt_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_appointment(
    pet_id: int,
    appt_id: int,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Appointment).where(Appointment.id == appt_id, Appointment.pet_id == pet_id))
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    await db.delete(appt)
    await db.commit()
