from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_consented_user
from app.models.lab import Lab
from app.models.pet import Pet
from app.models.user import User
from app.routers.pets import get_pet_for_owner
from app.schemas.lab import (
    LAB_TEMPLATES,
    LabCreate,
    LabResponse,
    LabTemplatesResponse,
    LabUpdate,
)
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/pets/{pet_id}/labs", tags=["labs"])


def _to_dt(d) -> datetime | None:
    if d is None:
        return None
    if isinstance(d, datetime):
        return d
    return datetime.combine(d, datetime.min.time())


@router.get("/templates", response_model=LabTemplatesResponse)
async def get_lab_templates():
    """Return the field templates for each lab type (no auth required for form helpers)."""
    return LabTemplatesResponse(templates=LAB_TEMPLATES)


@router.get("", response_model=list[LabResponse])
async def list_labs(
    pet_id: int,
    lab_type: str | None = None,
    pet: Pet = Depends(get_pet_for_owner),
    db: AsyncSession = Depends(get_db),
):
    q = select(Lab).where(Lab.pet_id == pet_id).order_by(Lab.lab_date.desc().nullslast(), Lab.created_at.desc())
    if lab_type:
        q = q.where(Lab.lab_type == lab_type)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=LabResponse, status_code=status.HTTP_201_CREATED)
async def create_lab(
    pet_id: int,
    data: LabCreate,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    lab = Lab(
        pet_id=pet_id,
        lab_type=data.lab_type.value,
        lab_date=_to_dt(data.lab_date),
        veterinarian=data.veterinarian,
        clinic=data.clinic,
        results=data.results,
        notes=data.notes,
        document_id=data.document_id,
    )
    db.add(lab)
    await db.commit()
    await db.refresh(lab)
    await create_audit_log(
        db, user_id=user.id, action="CREATE_LAB",
        resource_type="Lab", resource_id=lab.id,
        ip_address=request.client.host if request.client else None,
    )
    return LabResponse.model_validate(lab)


@router.get("/{lab_id}", response_model=LabResponse)
async def get_lab(
    pet_id: int,
    lab_id: int,
    pet: Pet = Depends(get_pet_for_owner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Lab).where(Lab.id == lab_id, Lab.pet_id == pet_id))
    lab = result.scalar_one_or_none()
    if lab is None:
        raise HTTPException(status_code=404, detail="Lab not found")
    return LabResponse.model_validate(lab)


@router.put("/{lab_id}", response_model=LabResponse)
async def update_lab(
    pet_id: int,
    lab_id: int,
    updates: LabUpdate,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Lab).where(Lab.id == lab_id, Lab.pet_id == pet_id))
    lab = result.scalar_one_or_none()
    if lab is None:
        raise HTTPException(status_code=404, detail="Lab not found")

    data = updates.model_dump(exclude_none=True)
    if "lab_type" in data:
        data["lab_type"] = data["lab_type"].value if hasattr(data["lab_type"], "value") else data["lab_type"]
    if "lab_date" in data:
        data["lab_date"] = _to_dt(data["lab_date"])
    for field, value in data.items():
        setattr(lab, field, value)

    await db.commit()
    await db.refresh(lab)
    await create_audit_log(
        db, user_id=user.id, action="UPDATE_LAB",
        resource_type="Lab", resource_id=lab.id,
        ip_address=request.client.host if request.client else None,
    )
    return LabResponse.model_validate(lab)


@router.delete("/{lab_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lab(
    pet_id: int,
    lab_id: int,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Lab).where(Lab.id == lab_id, Lab.pet_id == pet_id))
    lab = result.scalar_one_or_none()
    if lab is None:
        raise HTTPException(status_code=404, detail="Lab not found")
    await db.delete(lab)
    await db.commit()
    await create_audit_log(
        db, user_id=user.id, action="DELETE_LAB",
        resource_type="Lab", resource_id=lab_id,
        ip_address=request.client.host if request.client else None,
    )
