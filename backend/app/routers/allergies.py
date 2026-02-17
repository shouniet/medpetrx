from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_consented_user
from app.models.allergy import Allergy, AllergyType
from app.models.pet import Pet
from app.models.user import User
from app.routers.pets import get_pet_for_owner
from app.schemas.allergy import AllergyCreate, AllergyResponse, AllergyUpdate
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/pets/{pet_id}/allergies", tags=["allergies"])


def _to_dt(d) -> datetime | None:
    if d is None:
        return None
    if isinstance(d, datetime):
        return d
    return datetime.combine(d, datetime.min.time())


@router.get("", response_model=list[AllergyResponse])
async def list_allergies(
    pet_id: int,
    allergy_type: AllergyType | None = None,
    pet: Pet = Depends(get_pet_for_owner),
    db: AsyncSession = Depends(get_db),
):
    q = select(Allergy).where(Allergy.pet_id == pet_id)
    if allergy_type:
        q = q.where(Allergy.allergy_type == allergy_type)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=AllergyResponse, status_code=status.HTTP_201_CREATED)
async def create_allergy(
    pet_id: int,
    data: AllergyCreate,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    allergy = Allergy(
        pet_id=pet_id,
        allergy_type=data.allergy_type,
        substance_name=data.substance_name,
        reaction_desc=data.reaction_desc,
        severity=data.severity,
        date_noticed=_to_dt(data.date_noticed),
        vet_verified=data.vet_verified,
        document_id=data.document_id,
    )
    db.add(allergy)
    await db.commit()
    await db.refresh(allergy)
    await create_audit_log(db, user_id=user.id, action="CREATE_ALLERGY", resource_type="Allergy", resource_id=allergy.id, ip_address=request.client.host if request.client else None)
    return AllergyResponse.model_validate(allergy)


@router.put("/{allergy_id}", response_model=AllergyResponse)
async def update_allergy(
    pet_id: int,
    allergy_id: int,
    updates: AllergyUpdate,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Allergy).where(Allergy.id == allergy_id, Allergy.pet_id == pet_id))
    allergy = result.scalar_one_or_none()
    if allergy is None:
        raise HTTPException(status_code=404, detail="Allergy not found")
    for field, value in updates.model_dump(exclude_none=True).items():
        if field == "date_noticed":
            value = _to_dt(value)
        setattr(allergy, field, value)
    await db.commit()
    await db.refresh(allergy)
    await create_audit_log(db, user_id=user.id, action="UPDATE_ALLERGY", resource_type="Allergy", resource_id=allergy.id, ip_address=request.client.host if request.client else None)
    return AllergyResponse.model_validate(allergy)


@router.delete("/{allergy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_allergy(
    pet_id: int,
    allergy_id: int,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Allergy).where(Allergy.id == allergy_id, Allergy.pet_id == pet_id))
    allergy = result.scalar_one_or_none()
    if allergy is None:
        raise HTTPException(status_code=404, detail="Allergy not found")
    await db.delete(allergy)
    await db.commit()
    await create_audit_log(db, user_id=user.id, action="DELETE_ALLERGY", resource_type="Allergy", resource_id=allergy_id, ip_address=request.client.host if request.client else None)
