import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies import get_consented_user
from app.models.document import Document, ExtractionStatus
from app.models.pet import Pet
from app.models.user import User
from app.routers.pets import get_pet_for_owner
from app.schemas.document import DocumentResponse
from app.services.audit_service import create_audit_log
from app.services.extraction_service import run_extraction

router = APIRouter(tags=["documents"])

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_TYPES = {"application/pdf", "image/jpeg", "image/png"}


@router.post(
    "/pets/{pet_id}/documents/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    pet_id: int,
    background_tasks: BackgroundTasks,
    request: Request,
    file: UploadFile = File(...),
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF, JPG, PNG accepted")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum 10 MB.")

    # Save with UUID prefix to avoid filename conflicts
    safe_name = f"{uuid.uuid4()}_{file.filename}"
    file_dir = Path(settings.upload_dir) / str(pet_id)
    file_dir.mkdir(parents=True, exist_ok=True)
    file_path = file_dir / safe_name
    file_path.write_bytes(content)

    doc = Document(
        pet_id=pet_id,
        filename=file.filename,
        file_path=str(file_path),
        extraction_status=ExtractionStatus.PENDING,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    background_tasks.add_task(run_extraction, doc.id)

    await create_audit_log(
        db,
        user_id=user.id,
        action="UPLOAD_DOCUMENT",
        resource_type="Document",
        resource_id=doc.id,
        ip_address=request.client.host if request.client else None,
    )
    return DocumentResponse.model_validate(doc)


@router.get("/pets/{pet_id}/documents", response_model=list[DocumentResponse])
async def list_documents(
    pet_id: int,
    pet: Pet = Depends(get_pet_for_owner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Document).where(Document.pet_id == pet_id).order_by(Document.upload_date.desc()))
    return result.scalars().all()


@router.get("/documents/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: int,
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    doc = await db.get(Document, doc_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    # Verify ownership via pet
    pet = await db.get(Pet, doc.pet_id)
    if pet is None or pet.owner_id != user.id:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentResponse.model_validate(doc)
