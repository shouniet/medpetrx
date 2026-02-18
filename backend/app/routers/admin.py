"""Admin router – full CRUD for users, pets and medications."""

import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, File, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_admin_user
from app.models.medication import Medication
from app.models.pet import Pet
from app.models.user import User
from app.schemas.medication import MedicationCreate, MedicationResponse, MedicationUpdate
from app.schemas.pet import PetCreate, PetResponse, PetUpdate
from app.schemas.user import AdminUserUpdate, UserCreate, UserResponse
from app.services.audit_service import create_audit_log
from app.services.auth_service import hash_password

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB

router = APIRouter(prefix="/admin", tags=["admin"])

# ─── helpers ────────────────────────────────────────────────────────────────────
def _to_dt(d) -> datetime | None:
    if d is None:
        return None
    if isinstance(d, datetime):
        return d
    return datetime.combine(d, datetime.min.time())


# ═══════════════════════════════════════════════════════════════════════════════
#  USERS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/users", response_model=list[UserResponse])
async def list_users(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).order_by(User.id))
    return result.scalars().all()


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse.model_validate(user)


@router.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    request: Request,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(User).where(User.email == user_data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        phone=user_data.phone,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    await create_audit_log(
        db, user_id=admin.id, action="ADMIN_CREATE_USER",
        resource_type="User", resource_id=user.id,
        ip_address=request.client.host if request.client else None,
    )
    return UserResponse.model_validate(user)


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    updates: AdminUserUpdate,
    request: Request,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    data = updates.model_dump(exclude_none=True)
    if "password" in data:
        user.hashed_password = hash_password(data.pop("password"))
    for field, value in data.items():
        setattr(user, field, value)

    await db.commit()
    await db.refresh(user)
    await create_audit_log(
        db, user_id=admin.id, action="ADMIN_UPDATE_USER",
        resource_type="User", resource_id=user.id,
        ip_address=request.client.host if request.client else None,
    )
    return UserResponse.model_validate(user)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    request: Request,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.commit()
    await create_audit_log(
        db, user_id=admin.id, action="ADMIN_DELETE_USER",
        resource_type="User", resource_id=user_id,
        ip_address=request.client.host if request.client else None,
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  PETS  (admin can see / edit any pet regardless of owner)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/pets", response_model=list[PetResponse])
async def list_all_pets(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Pet).order_by(Pet.id))
    return result.scalars().all()


@router.get("/pets/{pet_id}", response_model=PetResponse)
async def get_pet(
    pet_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    pet = await db.get(Pet, pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    return PetResponse.model_validate(pet)


@router.post("/pets", response_model=PetResponse, status_code=status.HTTP_201_CREATED)
async def create_pet(
    pet_data: PetCreate,
    owner_id: int,
    request: Request,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    owner = await db.get(User, owner_id)
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")

    dob_dt = datetime.combine(pet_data.dob, datetime.min.time()) if pet_data.dob else None
    pet = Pet(
        owner_id=owner_id,
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
        db, user_id=admin.id, action="ADMIN_CREATE_PET",
        resource_type="Pet", resource_id=pet.id,
        ip_address=request.client.host if request.client else None,
    )
    return PetResponse.model_validate(pet)


@router.put("/pets/{pet_id}", response_model=PetResponse)
async def update_pet(
    pet_id: int,
    updates: PetUpdate,
    request: Request,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    pet = await db.get(Pet, pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")

    for field, value in updates.model_dump(exclude_none=True).items():
        if field == "dob" and value is not None:
            value = datetime.combine(value, datetime.min.time())
        setattr(pet, field, value)
    await db.commit()
    await db.refresh(pet)
    await create_audit_log(
        db, user_id=admin.id, action="ADMIN_UPDATE_PET",
        resource_type="Pet", resource_id=pet.id,
        ip_address=request.client.host if request.client else None,
    )
    return PetResponse.model_validate(pet)


@router.delete("/pets/{pet_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pet(
    pet_id: int,
    request: Request,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    pet = await db.get(Pet, pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    await db.delete(pet)
    await db.commit()
    await create_audit_log(
        db, user_id=admin.id, action="ADMIN_DELETE_PET",
        resource_type="Pet", resource_id=pet_id,
        ip_address=request.client.host if request.client else None,
    )


@router.post("/pets/{pet_id}/image", response_model=PetResponse)
async def admin_upload_pet_image(
    pet_id: int,
    request: Request,
    file: UploadFile = File(...),
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    pet = await db.get(Pet, pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Invalid image type. Allowed: JPEG, PNG, WebP, GIF")
    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Image too large. Max 5 MB")

    image_dir = Path(settings.upload_dir) / "pet_images"
    image_dir.mkdir(parents=True, exist_ok=True)

    if pet.image_url:
        old_path = Path(settings.upload_dir) / pet.image_url.lstrip("/uploads/")
        if old_path.exists():
            old_path.unlink()

    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    (image_dir / filename).write_bytes(content)

    pet.image_url = f"/uploads/pet_images/{filename}"
    await db.commit()
    await db.refresh(pet)
    await create_audit_log(
        db, user_id=admin.id, action="ADMIN_UPLOAD_PET_IMAGE",
        resource_type="Pet", resource_id=pet.id,
        ip_address=request.client.host if request.client else None,
    )
    return PetResponse.model_validate(pet)


@router.delete("/pets/{pet_id}/image", response_model=PetResponse)
async def admin_delete_pet_image(
    pet_id: int,
    request: Request,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    pet = await db.get(Pet, pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")
    if pet.image_url:
        old_path = Path(settings.upload_dir) / pet.image_url.lstrip("/uploads/")
        if old_path.exists():
            old_path.unlink()
    pet.image_url = None
    await db.commit()
    await db.refresh(pet)
    return PetResponse.model_validate(pet)


# ═══════════════════════════════════════════════════════════════════════════════
#  MEDICATIONS  (admin can see / edit any medication)
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/medications", response_model=list[MedicationResponse])
async def list_all_medications(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Medication).order_by(Medication.id))
    return result.scalars().all()


@router.get("/medications/{med_id}", response_model=MedicationResponse)
async def get_medication(
    med_id: int,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    med = await db.get(Medication, med_id)
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    return MedicationResponse.model_validate(med)


@router.post("/medications", response_model=MedicationResponse, status_code=status.HTTP_201_CREATED)
async def create_medication(
    med_data: MedicationCreate,
    pet_id: int,
    request: Request,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    pet = await db.get(Pet, pet_id)
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")

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
        db, user_id=admin.id, action="ADMIN_CREATE_MEDICATION",
        resource_type="Medication", resource_id=med.id,
        ip_address=request.client.host if request.client else None,
    )
    return MedicationResponse.model_validate(med)


@router.put("/medications/{med_id}", response_model=MedicationResponse)
async def update_medication(
    med_id: int,
    updates: MedicationUpdate,
    request: Request,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    med = await db.get(Medication, med_id)
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    for field, value in updates.model_dump(exclude_none=True).items():
        if field in ("start_date", "stop_date", "refill_reminder_date"):
            value = _to_dt(value)
        setattr(med, field, value)
    await db.commit()
    await db.refresh(med)
    await create_audit_log(
        db, user_id=admin.id, action="ADMIN_UPDATE_MEDICATION",
        resource_type="Medication", resource_id=med.id,
        ip_address=request.client.host if request.client else None,
    )
    return MedicationResponse.model_validate(med)


@router.delete("/medications/{med_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_medication(
    med_id: int,
    request: Request,
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    med = await db.get(Medication, med_id)
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    await db.delete(med)
    await db.commit()
    await create_audit_log(
        db, user_id=admin.id, action="ADMIN_DELETE_MEDICATION",
        resource_type="Medication", resource_id=med_id,
        ip_address=request.client.host if request.client else None,
    )


# ═══════════════════════════════════════════════════════════════════════════════
#  STATS
# ═══════════════════════════════════════════════════════════════════════════════

@router.get("/stats")
async def admin_stats(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    users_count = (await db.execute(select(func.count(User.id)))).scalar() or 0
    pets_count = (await db.execute(select(func.count(Pet.id)))).scalar() or 0
    meds_count = (await db.execute(select(func.count(Medication.id)))).scalar() or 0
    return {"users": users_count, "pets": pets_count, "medications": meds_count}
