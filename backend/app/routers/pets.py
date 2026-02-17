from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_consented_user
from app.models.pet import Pet
from app.models.user import User
from app.schemas.pet import PetCreate, PetResponse, PetUpdate, WeightLogAdd
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/pets", tags=["pets"])


async def get_pet_for_owner(
    pet_id: int,
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
) -> Pet:
    result = await db.execute(
        select(Pet).where(Pet.id == pet_id, Pet.owner_id == user.id)
    )
    pet = result.scalar_one_or_none()
    if pet is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pet not found")
    return pet


@router.get("", response_model=list[PetResponse])
async def list_pets(
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Pet).where(Pet.owner_id == user.id))
    return result.scalars().all()


@router.post("", response_model=PetResponse, status_code=status.HTTP_201_CREATED)
async def create_pet(
    pet_data: PetCreate,
    request: Request,
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    dob_dt = datetime.combine(pet_data.dob, datetime.min.time()) if pet_data.dob else None
    pet = Pet(
        owner_id=user.id,
        name=pet_data.name,
        species=pet_data.species,
        breed=pet_data.breed,
        dob=dob_dt,
        sex=pet_data.sex,
        microchip_num=pet_data.microchip_num,
        insurance=pet_data.insurance,
        weight_log=[],
    )
    db.add(pet)
    await db.commit()
    await db.refresh(pet)
    await create_audit_log(
        db,
        user_id=user.id,
        action="CREATE_PET",
        resource_type="Pet",
        resource_id=pet.id,
        ip_address=request.client.host if request.client else None,
    )
    return PetResponse.model_validate(pet)


@router.get("/{pet_id}", response_model=PetResponse)
async def get_pet(pet: Pet = Depends(get_pet_for_owner)):
    return PetResponse.model_validate(pet)


@router.put("/{pet_id}", response_model=PetResponse)
async def update_pet(
    updates: PetUpdate,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    for field, value in updates.model_dump(exclude_none=True).items():
        if field == "dob" and value is not None:
            value = datetime.combine(value, datetime.min.time())
        setattr(pet, field, value)
    await db.commit()
    await db.refresh(pet)
    await create_audit_log(
        db,
        user_id=user.id,
        action="UPDATE_PET",
        resource_type="Pet",
        resource_id=pet.id,
        ip_address=request.client.host if request.client else None,
    )
    return PetResponse.model_validate(pet)


@router.delete("/{pet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pet(
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    pet_id = pet.id
    await db.delete(pet)
    await db.commit()
    await create_audit_log(
        db,
        user_id=user.id,
        action="DELETE_PET",
        resource_type="Pet",
        resource_id=pet_id,
        ip_address=request.client.host if request.client else None,
    )


@router.post("/{pet_id}/weight", response_model=PetResponse)
async def add_weight_entry(
    weight: WeightLogAdd,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import update as sa_update
    existing = pet.weight_log or []
    existing.append({"date": weight.date, "weight_kg": weight.weight_kg})
    # Use SQLAlchemy update to ensure JSON column change is detected
    await db.execute(
        sa_update(Pet).where(Pet.id == pet.id).values(weight_log=existing)
    )
    await db.commit()
    await db.refresh(pet)
    return PetResponse.model_validate(pet)
