from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_consented_user
from app.models.user import User
from app.models.vet_provider import VetProvider
from app.schemas.vet_provider import VetProviderCreate, VetProviderResponse, VetProviderUpdate
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/vet-providers", tags=["vet-providers"])


@router.get("", response_model=list[VetProviderResponse])
async def list_vet_providers(
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(VetProvider)
        .where(VetProvider.owner_id == user.id)
        .order_by(VetProvider.is_primary.desc(), VetProvider.clinic_name)
    )
    return result.scalars().all()


@router.post("", response_model=VetProviderResponse, status_code=status.HTTP_201_CREATED)
async def create_vet_provider(
    data: VetProviderCreate,
    request: Request,
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    provider = VetProvider(owner_id=user.id, **data.model_dump())
    db.add(provider)
    await db.commit()
    await db.refresh(provider)
    await create_audit_log(db, user_id=user.id, action="CREATE_VET_PROVIDER", resource_type="VetProvider", resource_id=provider.id, ip_address=request.client.host if request.client else None)
    return provider


@router.put("/{provider_id}", response_model=VetProviderResponse)
async def update_vet_provider(
    provider_id: int,
    updates: VetProviderUpdate,
    request: Request,
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(VetProvider).where(VetProvider.id == provider_id, VetProvider.owner_id == user.id)
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Vet provider not found")
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(provider, field, value)
    await db.commit()
    await db.refresh(provider)
    await create_audit_log(db, user_id=user.id, action="UPDATE_VET_PROVIDER", resource_type="VetProvider", resource_id=provider.id, ip_address=request.client.host if request.client else None)
    return provider


@router.delete("/{provider_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vet_provider(
    provider_id: int,
    request: Request,
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(VetProvider).where(VetProvider.id == provider_id, VetProvider.owner_id == user.id)
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Vet provider not found")
    await db.delete(provider)
    await db.commit()
