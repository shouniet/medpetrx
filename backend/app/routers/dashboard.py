"""Dashboard summary: overdue vaccines, refill reminders, upcoming appointments."""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_consented_user
from app.models.appointment import Appointment
from app.models.medication import Medication
from app.models.pet import Pet
from app.models.user import User
from app.models.vaccine import Vaccine

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def dashboard_summary(
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    now = datetime.utcnow()
    soon = now + timedelta(days=30)

    # Get user's pets
    pets_result = await db.execute(select(Pet).where(Pet.owner_id == user.id))
    pets = pets_result.scalars().all()
    pet_ids = [p.id for p in pets]
    pet_map = {p.id: p.name for p in pets}

    if not pet_ids:
        return {"overdue_vaccines": [], "upcoming_vaccines": [], "refill_reminders": [], "upcoming_appointments": []}

    # ── Overdue vaccines (next_due_date < now) ──
    overdue_vax_result = await db.execute(
        select(Vaccine).where(
            Vaccine.pet_id.in_(pet_ids),
            Vaccine.next_due_date != None,  # noqa: E711
            Vaccine.next_due_date < now,
        ).order_by(Vaccine.next_due_date)
    )
    overdue_vaccines = [
        {"id": v.id, "pet_id": v.pet_id, "pet_name": pet_map.get(v.pet_id, ""), "name": v.name, "next_due_date": v.next_due_date.isoformat()}
        for v in overdue_vax_result.scalars().all()
    ]

    # ── Upcoming vaccines (due within 30 days) ──
    upcoming_vax_result = await db.execute(
        select(Vaccine).where(
            Vaccine.pet_id.in_(pet_ids),
            Vaccine.next_due_date != None,  # noqa: E711
            Vaccine.next_due_date >= now,
            Vaccine.next_due_date <= soon,
        ).order_by(Vaccine.next_due_date)
    )
    upcoming_vaccines = [
        {"id": v.id, "pet_id": v.pet_id, "pet_name": pet_map.get(v.pet_id, ""), "name": v.name, "next_due_date": v.next_due_date.isoformat()}
        for v in upcoming_vax_result.scalars().all()
    ]

    # ── Medication refill reminders (coming up or overdue) ──
    refill_result = await db.execute(
        select(Medication).where(
            Medication.pet_id.in_(pet_ids),
            Medication.is_active == True,  # noqa: E712
            Medication.refill_reminder_date != None,  # noqa: E711
            Medication.refill_reminder_date <= soon,
        ).order_by(Medication.refill_reminder_date)
    )
    refill_reminders = [
        {
            "id": m.id, "pet_id": m.pet_id, "pet_name": pet_map.get(m.pet_id, ""),
            "drug_name": m.drug_name, "refill_reminder_date": m.refill_reminder_date.isoformat(),
            "is_overdue": m.refill_reminder_date < now,
        }
        for m in refill_result.scalars().all()
    ]

    # ── Upcoming appointments (next 30 days) ──
    upcoming_appt_result = await db.execute(
        select(Appointment).where(
            Appointment.pet_id.in_(pet_ids),
            Appointment.status == "scheduled",
            Appointment.appointment_date >= now,
            Appointment.appointment_date <= soon,
        ).order_by(Appointment.appointment_date)
    )
    upcoming_appointments = [
        {
            "id": a.id, "pet_id": a.pet_id, "pet_name": pet_map.get(a.pet_id, ""),
            "title": a.title, "appointment_date": a.appointment_date.isoformat(),
            "clinic": a.clinic, "veterinarian": a.veterinarian,
        }
        for a in upcoming_appt_result.scalars().all()
    ]

    return {
        "overdue_vaccines": overdue_vaccines,
        "upcoming_vaccines": upcoming_vaccines,
        "refill_reminders": refill_reminders,
        "upcoming_appointments": upcoming_appointments,
    }
