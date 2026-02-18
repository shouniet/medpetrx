from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_admin_user
from app.models.vet_clinic_ref import VetClinicRef
from app.models.user import User
from app.schemas.vet_clinic_ref import VetClinicRefCreate, VetClinicRefOut, VetClinicRefUpdate

router = APIRouter(prefix="/vet-clinic-refs", tags=["vet-clinic-refs"])


# ── Public read endpoints ──────────────────────────────────────

@router.get("")
async def list_vet_clinic_refs(
    search: str | None = Query(None, description="Search by clinic name, city, or specialty"),
    city: str | None = Query(None, description="Filter by city"),
    specialty: str | None = Query(None, description="Filter by specialty"),
    is_emergency: bool | None = Query(None, description="Filter emergency clinics"),
    db: AsyncSession = Depends(get_db),
):
    """Return the reference list of MA veterinary clinics with optional filters."""
    query = select(VetClinicRef).where(VetClinicRef.is_active == True)  # noqa: E712

    if city:
        query = query.where(func.lower(VetClinicRef.city) == city.lower())

    if specialty:
        query = query.where(func.lower(VetClinicRef.specialty).like(f"%{specialty.lower()}%"))

    if is_emergency is not None:
        query = query.where(VetClinicRef.is_emergency == is_emergency)

    if search:
        s = f"%{search.lower()}%"
        query = query.where(
            func.lower(VetClinicRef.clinic_name).like(s)
            | func.lower(VetClinicRef.city).like(s)
            | func.lower(VetClinicRef.specialty).like(s)
            | func.lower(VetClinicRef.address).like(s)
        )

    query = query.order_by(VetClinicRef.clinic_name)
    result = await db.execute(query)
    rows = result.scalars().all()

    clinics = [
        {
            "id": r.id,
            "clinic_name": r.clinic_name,
            "veterinarian_name": r.veterinarian_name,
            "phone": r.phone,
            "email": r.email,
            "address": r.address,
            "city": r.city,
            "state": r.state,
            "zip_code": r.zip_code,
            "website": r.website,
            "specialty": r.specialty,
            "services": r.services,
            "is_emergency": r.is_emergency,
        }
        for r in rows
    ]

    return {"clinics": clinics, "total": len(clinics)}


@router.get("/cities")
async def get_cities(db: AsyncSession = Depends(get_db)):
    """Return distinct cities in the reference list."""
    result = await db.execute(
        select(VetClinicRef.city)
        .where(VetClinicRef.is_active == True, VetClinicRef.city.isnot(None))  # noqa: E712
        .distinct()
        .order_by(VetClinicRef.city)
    )
    cities = [row[0] for row in result.all()]
    return {"cities": cities}


@router.get("/specialties")
async def get_specialties(db: AsyncSession = Depends(get_db)):
    """Return distinct specialties in the reference list."""
    result = await db.execute(
        select(VetClinicRef.specialty)
        .where(VetClinicRef.is_active == True, VetClinicRef.specialty.isnot(None))  # noqa: E712
        .distinct()
        .order_by(VetClinicRef.specialty)
    )
    specialties = [row[0] for row in result.all()]
    return {"specialties": specialties}


# ── Admin CRUD endpoints ──────────────────────────────────────

@router.get("/admin/all", response_model=list[VetClinicRefOut])
async def admin_list_all(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Admin: list ALL vet clinic refs (including inactive)."""
    result = await db.execute(
        select(VetClinicRef).order_by(VetClinicRef.clinic_name)
    )
    return result.scalars().all()


@router.post("", response_model=VetClinicRefOut, status_code=201)
async def create_vet_clinic_ref(
    payload: VetClinicRefCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Admin: create a new vet clinic reference entry."""
    clinic = VetClinicRef(**payload.model_dump())
    db.add(clinic)
    await db.commit()
    await db.refresh(clinic)
    return clinic


@router.put("/{clinic_id}", response_model=VetClinicRefOut)
async def update_vet_clinic_ref(
    clinic_id: int,
    payload: VetClinicRefUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Admin: update a vet clinic reference entry."""
    result = await db.execute(
        select(VetClinicRef).where(VetClinicRef.id == clinic_id)
    )
    clinic = result.scalars().first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Vet clinic ref not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(clinic, field, value)

    await db.commit()
    await db.refresh(clinic)
    return clinic


@router.delete("/{clinic_id}", status_code=204)
async def delete_vet_clinic_ref(
    clinic_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Admin: permanently delete a vet clinic reference entry."""
    result = await db.execute(
        select(VetClinicRef).where(VetClinicRef.id == clinic_id)
    )
    clinic = result.scalars().first()
    if not clinic:
        raise HTTPException(status_code=404, detail="Vet clinic ref not found")

    await db.delete(clinic)
    await db.commit()
