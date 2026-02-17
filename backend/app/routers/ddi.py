from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_consented_user
from app.models.medication import Medication
from app.models.pet import Pet
from app.models.user import User
from app.routers.pets import get_pet_for_owner
from app.services.audit_service import create_audit_log
from app.services.ddi_service import check_drug_interactions

router = APIRouter(tags=["ddi"])

DISCLAIMER = (
    "Data sourced from OpenFDA (human drug database). "
    "Veterinary-specific interactions may not be listed. "
    "This is for informational purposes only and is not a substitute for professional veterinary advice."
)


class DDIRequest(BaseModel):
    drug_names: list[str] | None = None  # If None, auto-pull active meds


class DDIResponse(BaseModel):
    drugs_checked: list[str]
    interactions: list[dict]
    disclaimer: str


@router.post("/pets/{pet_id}/medications/check-interactions", response_model=DDIResponse)
async def check_interactions(
    pet_id: int,
    body: DDIRequest,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    if body.drug_names:
        drug_names = body.drug_names
    else:
        result = await db.execute(
            select(Medication.drug_name).where(
                Medication.pet_id == pet_id,
                Medication.is_active == True,  # noqa: E712
            )
        )
        drug_names = [row[0] for row in result.all()]

    interactions = await check_drug_interactions(drug_names)

    await create_audit_log(
        db,
        user_id=user.id,
        action="DDI_CHECK",
        resource_type="Pet",
        resource_id=pet_id,
        ip_address=request.client.host if request.client else None,
    )

    return DDIResponse(
        drugs_checked=drug_names,
        interactions=interactions,
        disclaimer=DISCLAIMER,
    )


@router.post("/medications/check-interactions-all-pets", response_model=DDIResponse)
async def check_interactions_all_pets(
    request: Request,
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    """Check drug interactions across ALL of a user's pets' active medications."""
    pets_result = await db.execute(select(Pet).where(Pet.owner_id == user.id))
    pet_ids = [p.id for p in pets_result.scalars().all()]

    if not pet_ids:
        return DDIResponse(drugs_checked=[], interactions=[], disclaimer=DISCLAIMER)

    result = await db.execute(
        select(Medication.drug_name).where(
            Medication.pet_id.in_(pet_ids),
            Medication.is_active == True,  # noqa: E712
        )
    )
    drug_names = list(set(row[0] for row in result.all()))

    interactions = await check_drug_interactions(drug_names)

    await create_audit_log(
        db,
        user_id=user.id,
        action="DDI_CHECK_ALL_PETS",
        resource_type="User",
        resource_id=user.id,
        ip_address=request.client.host if request.client else None,
    )

    return DDIResponse(
        drugs_checked=drug_names,
        interactions=interactions,
        disclaimer=DISCLAIMER,
    )
