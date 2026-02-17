from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_consented_user
from app.models.pet import Pet
from app.models.problem import Problem
from app.models.user import User
from app.routers.pets import get_pet_for_owner
from app.schemas.problem import ProblemCreate, ProblemResponse, ProblemUpdate
from app.services.audit_service import create_audit_log

router = APIRouter(prefix="/pets/{pet_id}/problems", tags=["problems"])


def _to_dt(d) -> datetime | None:
    if d is None:
        return None
    if isinstance(d, datetime):
        return d
    return datetime.combine(d, datetime.min.time())


@router.get("", response_model=list[ProblemResponse])
async def list_problems(
    pet_id: int,
    active_only: bool = False,
    pet: Pet = Depends(get_pet_for_owner),
    db: AsyncSession = Depends(get_db),
):
    q = select(Problem).where(Problem.pet_id == pet_id)
    if active_only:
        q = q.where(Problem.is_active == True)  # noqa: E712
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=ProblemResponse, status_code=status.HTTP_201_CREATED)
async def create_problem(
    pet_id: int,
    data: ProblemCreate,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    problem = Problem(
        pet_id=pet_id,
        condition_name=data.condition_name,
        is_active=data.is_active,
        onset_date=_to_dt(data.onset_date),
        notes=data.notes,
    )
    db.add(problem)
    await db.commit()
    await db.refresh(problem)
    await create_audit_log(db, user_id=user.id, action="CREATE_PROBLEM", resource_type="Problem", resource_id=problem.id, ip_address=request.client.host if request.client else None)
    return ProblemResponse.model_validate(problem)


@router.put("/{problem_id}", response_model=ProblemResponse)
async def update_problem(
    pet_id: int,
    problem_id: int,
    updates: ProblemUpdate,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Problem).where(Problem.id == problem_id, Problem.pet_id == pet_id))
    problem = result.scalar_one_or_none()
    if problem is None:
        raise HTTPException(status_code=404, detail="Problem not found")
    for field, value in updates.model_dump(exclude_none=True).items():
        if field == "onset_date":
            value = _to_dt(value)
        setattr(problem, field, value)
    await db.commit()
    await db.refresh(problem)
    await create_audit_log(db, user_id=user.id, action="UPDATE_PROBLEM", resource_type="Problem", resource_id=problem.id, ip_address=request.client.host if request.client else None)
    return ProblemResponse.model_validate(problem)


@router.delete("/{problem_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_problem(
    pet_id: int,
    problem_id: int,
    request: Request,
    pet: Pet = Depends(get_pet_for_owner),
    user: User = Depends(get_consented_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Problem).where(Problem.id == problem_id, Problem.pet_id == pet_id))
    problem = result.scalar_one_or_none()
    if problem is None:
        raise HTTPException(status_code=404, detail="Problem not found")
    await db.delete(problem)
    await db.commit()
    await create_audit_log(db, user_id=user.id, action="DELETE_PROBLEM", resource_type="Problem", resource_id=problem_id, ip_address=request.client.host if request.client else None)
