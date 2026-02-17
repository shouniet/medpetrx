from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_consented_user
from app.models.allergy import Allergy, AllergyType
from app.models.document import Document
from app.models.medication import Medication
from app.models.pet import Pet
from app.models.problem import Problem
from app.models.user import User
from app.models.vaccine import Vaccine
from app.routers.pets import get_pet_for_owner
from app.schemas.extraction_review import (
    ConfirmResponse,
    ExtractionReviewSubmit,
    FieldDecision,
)
from app.services.allergy_service import check_medication_against_allergies
from app.services.audit_service import create_audit_log

router = APIRouter(tags=["extraction-review"])


def _to_dt(d) -> datetime | None:
    if d is None:
        return None
    if isinstance(d, datetime):
        return d
    return datetime.combine(d, datetime.min.time())


@router.post(
    "/pets/{pet_id}/documents/{doc_id}/confirm",
    response_model=ConfirmResponse,
    status_code=status.HTTP_201_CREATED,
)
async def confirm_extraction(
    pet_id: int,
    doc_id: int,
    review: ExtractionReviewSubmit,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify document belongs to this pet
    doc = await db.get(Document, doc_id)
    if doc is None or doc.pet_id != pet_id:
        raise HTTPException(status_code=404, detail="Document not found")

    allergy_warnings: list[dict] = []
    meds_saved = vax_saved = allergy_saved = prob_saved = 0

    # Save approved/edited medications
    for item in review.medications:
        if item.decision == FieldDecision.REJECTED:
            continue
        med = Medication(
            pet_id=pet_id,
            drug_name=item.drug_name,
            strength=item.strength,
            directions=item.directions,
            indication=item.indication,
            start_date=_to_dt(item.start_date),
            stop_date=_to_dt(item.stop_date),
            prescriber=item.prescriber,
            pharmacy=item.pharmacy,
            is_active=True,
            document_id=doc_id,
        )
        db.add(med)
        await db.flush()
        meds_saved += 1
        # Check allergy
        matches = await check_medication_against_allergies(db, pet_id, item.drug_name)
        for m in matches:
            allergy_warnings.append({
                "drug_name": item.drug_name,
                "allergy_substance": m.substance_name,
                "severity": m.severity,
            })

    # Save approved/edited vaccines
    for item in review.vaccines:
        if item.decision == FieldDecision.REJECTED:
            continue
        vaccine = Vaccine(
            pet_id=pet_id,
            name=item.name,
            date_given=_to_dt(item.date_given),
            clinic=item.clinic,
            lot_number=item.lot_number,
            next_due_date=_to_dt(item.next_due_date),
            document_id=doc_id,
        )
        db.add(vaccine)
        vax_saved += 1

    # Save approved/edited allergies
    for item in review.allergies:
        if item.decision == FieldDecision.REJECTED:
            continue
        try:
            allergy_type = AllergyType(item.allergy_type)
        except ValueError:
            allergy_type = AllergyType.DRUG
        allergy = Allergy(
            pet_id=pet_id,
            allergy_type=allergy_type,
            substance_name=item.substance_name,
            reaction_desc=item.reaction_desc,
            severity=item.severity,
            document_id=doc_id,
        )
        db.add(allergy)
        allergy_saved += 1

    # Save approved/edited problems
    for item in review.problems:
        if item.decision == FieldDecision.REJECTED:
            continue
        problem = Problem(
            pet_id=pet_id,
            condition_name=item.condition_name,
            onset_date=_to_dt(item.onset_date),
            is_active=item.is_active,
            notes=item.notes,
        )
        db.add(problem)
        prob_saved += 1

    await db.commit()
    await create_audit_log(
        db,
        user_id=user.id,
        action="CONFIRM_EXTRACTION",
        resource_type="Document",
        resource_id=doc_id,
        ip_address=request.client.host if request.client else None,
    )

    return ConfirmResponse(
        medications_saved=meds_saved,
        vaccines_saved=vax_saved,
        allergies_saved=allergy_saved,
        problems_saved=prob_saved,
        allergy_warnings=allergy_warnings,
    )
