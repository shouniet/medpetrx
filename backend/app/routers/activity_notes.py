from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_consented_user
from app.models.activity_note import ActivityNote
from app.models.pet import Pet
from app.models.user import User
from app.routers.pets import get_pet_for_owner
from app.schemas.activity_note import ActivityNoteCreate, ActivityNoteResponse, ActivityNoteUpdate
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/pets/{pet_id}/notes", tags=["activity-notes"])


def _to_dt(d) -> datetime | None:
    if d is None:
        return None
    if isinstance(d, datetime):
        return d
    return datetime.combine(d, datetime.min.time())


@router.get("", response_model=list[ActivityNoteResponse])
async def list_notes(
    pet_id: int,
    pet: Pet = Depends(get_pet_for_owner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ActivityNote)
        .where(ActivityNote.pet_id == pet_id)
        .order_by(ActivityNote.note_date.desc())
    )
    return result.scalars().all()


@router.post("", response_model=ActivityNoteResponse, status_code=status.HTTP_201_CREATED)
async def create_note(
    pet_id: int,
    data: ActivityNoteCreate,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    note = ActivityNote(
        pet_id=pet_id,
        note_date=_to_dt(data.note_date),
        category=data.category,
        title=data.title,
        body=data.body,
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    await create_audit_log(db, user_id=user.id, action="CREATE_NOTE", resource_type="ActivityNote", resource_id=note.id, ip_address=request.client.host if request.client else None)
    return note


@router.put("/{note_id}", response_model=ActivityNoteResponse)
async def update_note(
    pet_id: int,
    note_id: int,
    updates: ActivityNoteUpdate,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ActivityNote).where(ActivityNote.id == note_id, ActivityNote.pet_id == pet_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    for field, value in updates.model_dump(exclude_unset=True).items():
        if field == "note_date":
            value = _to_dt(value)
        setattr(note, field, value)
    await db.commit()
    await db.refresh(note)
    await create_audit_log(db, user_id=user.id, action="UPDATE_NOTE", resource_type="ActivityNote", resource_id=note.id, ip_address=request.client.host if request.client else None)
    return note


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    pet_id: int,
    note_id: int,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(ActivityNote).where(ActivityNote.id == note_id, ActivityNote.pet_id == pet_id))
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    await db.delete(note)
    await db.commit()
