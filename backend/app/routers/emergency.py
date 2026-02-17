import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_consented_user
from app.models.allergy import Allergy
from app.models.emergency_share import EmergencyShare
from app.models.medication import Medication
from app.models.pet import Pet
from app.models.problem import Problem
from app.models.user import User
from app.routers.pets import get_pet_for_owner
from app.services.audit_service import create_audit_log, create_audit_log_independent
from app.services.qr_service import generate_qr_code

router = APIRouter(tags=["emergency"])

FRONTEND_BASE = "http://localhost:3000"
DISCLAIMER = "For emergency veterinary reference only. Not a substitute for professional veterinary judgment."


class ShareRequest(BaseModel):
    access_type: str = "link"  # link / qr / otp
    expires_hours: int = 24


class ShareResponse(BaseModel):
    token: str
    url: str
    qr_code: str | None = None
    expires_at: datetime
    access_type: str


class EmergencySummary(BaseModel):
    pet_name: str
    species: str
    breed: str | None
    active_medications: list[dict]
    allergies: list[dict]
    active_problems: list[dict]
    disclaimer: str
    generated_at: datetime


@router.post("/pets/{pet_id}/emergency/share", response_model=ShareResponse)
async def create_share_link(
    pet_id: int,
    body: ShareRequest,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    if body.expires_hours < 1 or body.expires_hours > 168:
        raise HTTPException(status_code=400, detail="expires_hours must be between 1 and 168")

    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(hours=body.expires_hours)

    share = EmergencyShare(
        pet_id=pet_id,
        token=token,
        expires_at=expires_at,
        access_type=body.access_type,
        is_active=True,
    )
    db.add(share)
    await db.commit()
    await db.refresh(share)

    share_url = f"{FRONTEND_BASE}/emergency/{token}"
    qr_code = generate_qr_code(share_url) if body.access_type in ("qr",) else None

    await create_audit_log(
        db,
        user_id=user.id,
        action="CREATE_EMERGENCY_SHARE",
        resource_type="EmergencyShare",
        resource_id=share.id,
        ip_address=request.client.host if request.client else None,
    )

    return ShareResponse(
        token=token,
        url=share_url,
        qr_code=qr_code,
        expires_at=expires_at,
        access_type=body.access_type,
    )


@router.get("/pets/{pet_id}/emergency/shares", response_model=list[ShareResponse])
async def list_shares(
    pet_id: int,
    pet: Pet = Depends(get_pet_for_owner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EmergencyShare).where(
            EmergencyShare.pet_id == pet_id,
            EmergencyShare.is_active == True,  # noqa: E712
        ).order_by(EmergencyShare.created_at.desc())
    )
    shares = result.scalars().all()
    return [
        ShareResponse(
            token=s.token,
            url=f"{FRONTEND_BASE}/emergency/{s.token}",
            expires_at=s.expires_at,
            access_type=s.access_type,
        )
        for s in shares
    ]


@router.delete("/pets/{pet_id}/emergency/shares/{share_id}")
async def revoke_share(
    pet_id: int,
    share_id: int,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(EmergencyShare).where(EmergencyShare.id == share_id, EmergencyShare.pet_id == pet_id)
    )
    share = result.scalar_one_or_none()
    if share is None:
        raise HTTPException(status_code=404, detail="Share not found")
    share.is_active = False
    await db.commit()
    await create_audit_log(db, user_id=user.id, action="REVOKE_EMERGENCY_SHARE", resource_type="EmergencyShare", resource_id=share_id, ip_address=request.client.host if request.client else None)
    return {"revoked": True}


@router.get("/emergency/{token}", response_model=EmergencySummary)
async def get_emergency_summary(
    token: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — no auth required. Validates token + expiry."""
    result = await db.execute(
        select(EmergencyShare).where(
            EmergencyShare.token == token,
            EmergencyShare.is_active == True,  # noqa: E712
        )
    )
    share = result.scalar_one_or_none()
    if share is None:
        raise HTTPException(status_code=404, detail="Share link not found or has been revoked")

    if share.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Share link has expired")

    pet = await db.get(Pet, share.pet_id)
    if pet is None:
        raise HTTPException(status_code=404, detail="Pet not found")

    # Active medications
    meds_result = await db.execute(
        select(Medication).where(Medication.pet_id == pet.id, Medication.is_active == True)  # noqa: E712
    )
    meds = [
        {
            "drug_name": m.drug_name,
            "strength": m.strength,
            "directions": m.directions,
            "indication": m.indication,
        }
        for m in meds_result.scalars().all()
    ]

    # All allergies
    allergies_result = await db.execute(select(Allergy).where(Allergy.pet_id == pet.id))
    allergies = [
        {
            "substance_name": a.substance_name,
            "allergy_type": a.allergy_type,
            "severity": a.severity,
            "reaction_desc": a.reaction_desc,
        }
        for a in allergies_result.scalars().all()
    ]

    # Active problems
    probs_result = await db.execute(
        select(Problem).where(Problem.pet_id == pet.id, Problem.is_active == True)  # noqa: E712
    )
    problems = [
        {"condition_name": p.condition_name, "notes": p.notes}
        for p in probs_result.scalars().all()
    ]

    # Log access (no user_id — anonymous)
    ip = request.client.host if request.client else None
    await create_audit_log_independent(
        user_id=None,
        action="EMERGENCY_VIEW",
        resource_type="EmergencyShare",
        resource_id=share.id,
        ip_address=ip,
    )

    return EmergencySummary(
        pet_name=pet.name,
        species=pet.species,
        breed=pet.breed,
        active_medications=meds,
        allergies=allergies,
        active_problems=problems,
        disclaimer=DISCLAIMER,
        generated_at=datetime.utcnow(),
    )
