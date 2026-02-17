from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import cast, select, func, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_admin_user
from app.models.common_medication_ref import CommonMedicationRef
from app.models.user import User
from app.schemas.common_medication import (
    CommonMedicationCreate,
    CommonMedicationOut,
    CommonMedicationUpdate,
)

router = APIRouter(prefix="/common-medications", tags=["common-medications"])


# ── Public read endpoints ──────────────────────────────────────

@router.get("")
async def list_common_medications(
    search: str | None = Query(None, description="Search by drug name, class, or indication"),
    species: str | None = Query(None, description="Filter by species: dog or cat"),
    drug_class: str | None = Query(None, description="Filter by drug class"),
    db: AsyncSession = Depends(get_db),
):
    """Return the reference list of common veterinary medications with optional filters."""
    query = select(CommonMedicationRef).where(CommonMedicationRef.is_active == True)

    if species:
        # species is stored as JSON array e.g. ["dog","cat"] — cast to text for LIKE
        query = query.where(
            cast(CommonMedicationRef.species, String).like(f'%"{species.lower()}"%')
        )

    if drug_class:
        query = query.where(func.lower(CommonMedicationRef.drug_class).like(f"%{drug_class.lower()}%"))

    if search:
        s = f"%{search.lower()}%"
        query = query.where(
            func.lower(CommonMedicationRef.drug_name).like(s)
            | func.lower(CommonMedicationRef.drug_class).like(s)
            | func.lower(CommonMedicationRef.common_indications).like(s)
        )

    query = query.order_by(CommonMedicationRef.drug_name)
    result = await db.execute(query)
    rows = result.scalars().all()

    medications = [
        {
            "id": r.id,
            "drug_name": r.drug_name,
            "drug_class": r.drug_class,
            "species": r.species,
            "common_indications": r.common_indications,
            "typical_dose": r.typical_dose,
            "route": r.route,
            "common_side_effects": r.common_side_effects,
            "warnings": r.warnings,
        }
        for r in rows
    ]

    return {"medications": medications, "total": len(medications)}


@router.get("/drug-classes")
async def get_drug_classes(db: AsyncSession = Depends(get_db)):
    """Return distinct drug classes in the reference list."""
    result = await db.execute(
        select(CommonMedicationRef.drug_class)
        .where(CommonMedicationRef.is_active == True)
        .distinct()
        .order_by(CommonMedicationRef.drug_class)
    )
    classes = [row[0] for row in result.all()]
    return {"drug_classes": classes}


# ── Admin CRUD endpoints ──────────────────────────────────────

@router.get("/admin/all", response_model=list[CommonMedicationOut])
async def admin_list_all(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Admin: list ALL common medications (including inactive)."""
    result = await db.execute(
        select(CommonMedicationRef).order_by(CommonMedicationRef.drug_name)
    )
    return result.scalars().all()


@router.post("", response_model=CommonMedicationOut, status_code=201)
async def create_common_medication(
    payload: CommonMedicationCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Admin: create a new common medication entry."""
    # Normalise species to lowercase
    payload.species = [s.lower() for s in payload.species]
    med = CommonMedicationRef(**payload.model_dump())
    db.add(med)
    await db.commit()
    await db.refresh(med)
    return med


@router.put("/{med_id}", response_model=CommonMedicationOut)
async def update_common_medication(
    med_id: int,
    payload: CommonMedicationUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Admin: update a common medication entry."""
    result = await db.execute(
        select(CommonMedicationRef).where(CommonMedicationRef.id == med_id)
    )
    med = result.scalars().first()
    if not med:
        raise HTTPException(status_code=404, detail="Common medication not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "species" in update_data and update_data["species"] is not None:
        update_data["species"] = [s.lower() for s in update_data["species"]]

    for field, value in update_data.items():
        setattr(med, field, value)

    await db.commit()
    await db.refresh(med)
    return med


@router.delete("/{med_id}", status_code=204)
async def delete_common_medication(
    med_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Admin: permanently delete a common medication entry."""
    result = await db.execute(
        select(CommonMedicationRef).where(CommonMedicationRef.id == med_id)
    )
    med = result.scalars().first()
    if not med:
        raise HTTPException(status_code=404, detail="Common medication not found")

    await db.delete(med)
    await db.commit()
