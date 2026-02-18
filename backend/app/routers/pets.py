import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_consented_user
from app.models.pet import Pet
from app.models.user import User
from app.schemas.pet import PetCreate, PetResponse, PetUpdate, WeightLogAdd
from app.services.audit_service import create_audit_log

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB

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


@router.post("/{pet_id}/image", response_model=PetResponse)
async def upload_pet_image(
    request: Request,
    file: UploadFile = File(...),
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image type. Allowed: JPEG, PNG, WebP, GIF",
        )
    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image too large. Max 5 MB",
        )

    # Create pet_images directory
    image_dir = Path(settings.upload_dir) / "pet_images"
    image_dir.mkdir(parents=True, exist_ok=True)

    # Delete old image if exists
    if pet.image_url:
        old_path = Path(settings.upload_dir) / pet.image_url.lstrip("/uploads/")
        if old_path.exists():
            old_path.unlink()

    # Save new image with unique name
    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = image_dir / filename
    filepath.write_bytes(content)

    pet.image_url = f"/uploads/pet_images/{filename}"
    await db.commit()
    await db.refresh(pet)

    await create_audit_log(
        db,
        user_id=user.id,
        action="UPLOAD_PET_IMAGE",
        resource_type="Pet",
        resource_id=pet.id,
        ip_address=request.client.host if request.client else None,
    )
    return PetResponse.model_validate(pet)


@router.delete("/{pet_id}/image", response_model=PetResponse)
async def delete_pet_image(
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    if pet.image_url:
        old_path = Path(settings.upload_dir) / pet.image_url.lstrip("/uploads/")
        if old_path.exists():
            old_path.unlink()
    pet.image_url = None
    await db.commit()
    await db.refresh(pet)
    return PetResponse.model_validate(pet)
