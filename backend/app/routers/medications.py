from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_consented_user
from app.models.medication import Medication
from app.models.pet import Pet
from app.models.user import User
from app.routers.pets import get_pet_for_owner
from app.schemas.medication import (
    AllergyBrief,
    AllergyCheckRequest,
    AllergyCheckResponse,
    MedicationCreate,
    MedicationCreateResponse,
    MedicationResponse,
    MedicationUpdate,
)
from app.services.allergy_service import check_medication_against_allergies
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/pets/{pet_id}/medications", tags=["medications"])


def _to_dt(d) -> datetime | None:
    if d is None:
        return None
    if isinstance(d, datetime):
        return d
    return datetime.combine(d, datetime.min.time())


@router.post("/check-allergies", response_model=AllergyCheckResponse)
async def check_allergies_for_drug(
    pet_id: int,
    body: AllergyCheckRequest,
    pet: Pet = Depends(get_pet_for_owner),
    db: AsyncSession = Depends(get_db),
):
    matches = await check_medication_against_allergies(db, pet_id, body.drug_name)
    return AllergyCheckResponse(
        allergy_matches=[AllergyBrief.model_validate(a) for a in matches]
    )


@router.get("", response_model=list[MedicationResponse])
async def list_medications(
    pet_id: int,
    active_only: bool = False,
    pet: Pet = Depends(get_pet_for_owner),
    db: AsyncSession = Depends(get_db),
):
    q = select(Medication).where(Medication.pet_id == pet_id)
    if active_only:
        q = q.where(Medication.is_active == True)  # noqa: E712
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=MedicationCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_medication(
    pet_id: int,
    med_data: MedicationCreate,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    allergy_matches = await check_medication_against_allergies(db, pet_id, med_data.drug_name)

    med = Medication(
        pet_id=pet_id,
        drug_name=med_data.drug_name,
        strength=med_data.strength,
        directions=med_data.directions,
        indication=med_data.indication,
        start_date=_to_dt(med_data.start_date),
        stop_date=_to_dt(med_data.stop_date),
        prescriber=med_data.prescriber,
        pharmacy=med_data.pharmacy,
        is_active=med_data.is_active,
        document_id=med_data.document_id,
        refill_reminder_date=_to_dt(med_data.refill_reminder_date),
    )
    db.add(med)
    await db.commit()
    await db.refresh(med)
    await create_audit_log(
        db,
        user_id=user.id,
        action="CREATE_MEDICATION",
        resource_type="Medication",
        resource_id=med.id,
        ip_address=request.client.host if request.client else None,
    )
    return MedicationCreateResponse(
        medication=MedicationResponse.model_validate(med),
        allergy_warnings=[AllergyBrief.model_validate(a) for a in allergy_matches],
    )


@router.get("/{med_id}", response_model=MedicationResponse)
async def get_medication(
    pet_id: int,
    med_id: int,
    pet: Pet = Depends(get_pet_for_owner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Medication).where(Medication.id == med_id, Medication.pet_id == pet_id)
    )
    med = result.scalar_one_or_none()
    if med is None:
        raise HTTPException(status_code=404, detail="Medication not found")
    return MedicationResponse.model_validate(med)


@router.put("/{med_id}", response_model=MedicationResponse)
async def update_medication(
    pet_id: int,
    med_id: int,
    updates: MedicationUpdate,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Medication).where(Medication.id == med_id, Medication.pet_id == pet_id)
    )
    med = result.scalar_one_or_none()
    if med is None:
        raise HTTPException(status_code=404, detail="Medication not found")

    for field, value in updates.model_dump(exclude_none=True).items():
        if field in ("start_date", "stop_date", "refill_reminder_date"):
            value = _to_dt(value)
        setattr(med, field, value)
    await db.commit()
    await db.refresh(med)
    await create_audit_log(
        db,
        user_id=user.id,
        action="UPDATE_MEDICATION",
        resource_type="Medication",
        resource_id=med.id,
        ip_address=request.client.host if request.client else None,
    )
    return MedicationResponse.model_validate(med)


@router.delete("/{med_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_medication(
    pet_id: int,
    med_id: int,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Medication).where(Medication.id == med_id, Medication.pet_id == pet_id)
    )
    med = result.scalar_one_or_none()
    if med is None:
        raise HTTPException(status_code=404, detail="Medication not found")
    await db.delete(med)
    await db.commit()
    await create_audit_log(
        db,
        user_id=user.id,
        action="DELETE_MEDICATION",
        resource_type="Medication",
        resource_id=med_id,
        ip_address=request.client.host if request.client else None,
    )
