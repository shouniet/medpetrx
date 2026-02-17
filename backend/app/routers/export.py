"""Generate a PDF medical record summary for a pet."""

import io
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_consented_user
from app.models.allergy import Allergy
from app.models.appointment import Appointment
from app.models.lab import Lab
from app.models.medication import Medication
from app.models.pet import Pet
from app.models.problem import Problem
from app.models.user import User
from app.models.vaccine import Vaccine
from app.models.vital import Vital
from app.routers.pets import get_pet_for_owner

router = APIRouter(tags=["export"])


def _fmt(dt) -> str:
    if dt is None:
        return "—"
    if isinstance(dt, datetime):
        return dt.strftime("%Y-%m-%d")
    return str(dt)


@router.get("/pets/{pet_id}/export/pdf")
async def export_pet_pdf(
    pet_id: int,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    # Gather all data
    meds = (await db.execute(select(Medication).where(Medication.pet_id == pet_id).order_by(Medication.created_at.desc()))).scalars().all()
    vaccines = (await db.execute(select(Vaccine).where(Vaccine.pet_id == pet_id).order_by(Vaccine.date_given.desc()))).scalars().all()
    problems = (await db.execute(select(Problem).where(Problem.pet_id == pet_id))).scalars().all()
    allergies = (await db.execute(select(Allergy).where(Allergy.pet_id == pet_id))).scalars().all()
    labs_list = (await db.execute(select(Lab).where(Lab.pet_id == pet_id).order_by(Lab.lab_date.desc()))).scalars().all()
    vitals = (await db.execute(select(Vital).where(Vital.pet_id == pet_id).order_by(Vital.recorded_date.desc()))).scalars().all()
    appts = (await db.execute(select(Appointment).where(Appointment.pet_id == pet_id).order_by(Appointment.appointment_date.desc()))).scalars().all()

    # Build plain-text report (works without any extra lib; can be upgraded to reportlab later)
    lines: list[str] = []
    lines.append("=" * 60)
    lines.append("  MedPetRx — Medical Record Summary")
    lines.append("=" * 60)
    lines.append(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")
    lines.append("")
    lines.append(f"Pet Name: {pet.name}")
    lines.append(f"Species:  {pet.species}")
    lines.append(f"Breed:    {pet.breed or '—'}")
    lines.append(f"DOB:      {_fmt(pet.dob)}")
    lines.append(f"Sex:      {pet.sex or '—'}")
    lines.append(f"Microchip: {pet.microchip_num or '—'}")
    lines.append("")

    # Allergies
    lines.append("-" * 40)
    lines.append("ALLERGIES")
    lines.append("-" * 40)
    if allergies:
        for a in allergies:
            lines.append(f"  • {a.substance_name} ({a.allergy_type}) — Severity: {a.severity or '—'}")
            if a.reaction_desc:
                lines.append(f"    Reaction: {a.reaction_desc}")
    else:
        lines.append("  No known allergies on file.")
    lines.append("")

    # Problems
    lines.append("-" * 40)
    lines.append("PROBLEMS / CONDITIONS")
    lines.append("-" * 40)
    if problems:
        for p in problems:
            status = "Active" if p.is_active else "Resolved"
            lines.append(f"  • {p.condition_name} [{status}] — Onset: {_fmt(p.onset_date)}")
            if p.notes:
                lines.append(f"    Notes: {p.notes}")
    else:
        lines.append("  None on file.")
    lines.append("")

    # Medications
    lines.append("-" * 40)
    lines.append("MEDICATIONS")
    lines.append("-" * 40)
    if meds:
        for m in meds:
            active = "ACTIVE" if m.is_active else "inactive"
            lines.append(f"  • {m.drug_name} {m.strength or ''} [{active}]")
            if m.directions:
                lines.append(f"    Directions: {m.directions}")
            lines.append(f"    Prescriber: {m.prescriber or '—'}  |  Pharmacy: {m.pharmacy or '—'}")
            lines.append(f"    Start: {_fmt(m.start_date)}  |  Stop: {_fmt(m.stop_date)}")
    else:
        lines.append("  None on file.")
    lines.append("")

    # Vaccines
    lines.append("-" * 40)
    lines.append("VACCINES")
    lines.append("-" * 40)
    if vaccines:
        for v in vaccines:
            lines.append(f"  • {v.name} — Given: {_fmt(v.date_given)}  |  Next Due: {_fmt(v.next_due_date)}")
            if v.clinic:
                lines.append(f"    Clinic: {v.clinic}  |  Lot: {v.lot_number or '—'}")
    else:
        lines.append("  None on file.")
    lines.append("")

    # Labs
    lines.append("-" * 40)
    lines.append("LAB RESULTS")
    lines.append("-" * 40)
    if labs_list:
        for lab in labs_list:
            lines.append(f"  • {lab.lab_type.upper()} — Date: {_fmt(lab.lab_date)}  |  Vet: {lab.veterinarian or '—'}")
            if lab.results:
                for k, v in lab.results.items():
                    lines.append(f"      {k}: {v}")
            if lab.notes:
                lines.append(f"    Notes: {lab.notes}")
    else:
        lines.append("  None on file.")
    lines.append("")

    # Vitals
    lines.append("-" * 40)
    lines.append("VITALS HISTORY")
    lines.append("-" * 40)
    if vitals:
        for v in vitals:
            parts = [f"Date: {_fmt(v.recorded_date)}"]
            if v.weight_lbs:
                parts.append(f"Wt: {v.weight_lbs} lbs")
            if v.temperature_f:
                parts.append(f"Temp: {v.temperature_f}°F")
            if v.heart_rate_bpm:
                parts.append(f"HR: {v.heart_rate_bpm} bpm")
            if v.respiratory_rate:
                parts.append(f"RR: {v.respiratory_rate}")
            lines.append(f"  • {' | '.join(parts)}")
    else:
        lines.append("  None on file.")
    lines.append("")

    # Appointments
    lines.append("-" * 40)
    lines.append("APPOINTMENTS")
    lines.append("-" * 40)
    if appts:
        for a in appts:
            lines.append(f"  • {a.title} [{a.status}] — {_fmt(a.appointment_date)}")
            if a.clinic:
                lines.append(f"    Clinic: {a.clinic}  |  Vet: {a.veterinarian or '—'}")
            if a.reason:
                lines.append(f"    Reason: {a.reason}")
    else:
        lines.append("  None on file.")
    lines.append("")
    lines.append("=" * 60)
    lines.append("  This report is for informational purposes only.")
    lines.append("  Always consult your veterinarian for medical decisions.")
    lines.append("=" * 60)

    content = "\n".join(lines)
    buf = io.BytesIO(content.encode("utf-8"))
    filename = f"{pet.name}_medical_record_{datetime.utcnow().strftime('%Y%m%d')}.txt"

    return StreamingResponse(
        buf,
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
