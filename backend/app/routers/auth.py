from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import LoginRequest, TokenResponse, UserCreate, UserResponse
from app.services.audit_service import create_audit_log, create_audit_log_independent
from app.services.auth_service import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=user_data.email,
        hashed_password=hash_password(user_data.password),
        phone=user_data.phone,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        address_line1=user_data.address_line1,
        address_line2=user_data.address_line2,
        city=user_data.city,
        state=user_data.state,
        zip_code=user_data.zip_code,
        secondary_contact_name=user_data.secondary_contact_name,
        secondary_contact_phone=user_data.secondary_contact_phone,
        secondary_contact_relation=user_data.secondary_contact_relation,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    await create_audit_log(
        db,
        user_id=user.id,
        action="REGISTER",
        resource_type="User",
        resource_id=user.id,
        ip_address=request.client.host if request.client else None,
    )
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    ip = request.client.host if request.client else None
    result = await db.execute(select(User).where(User.email == login_data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(login_data.password, user.hashed_password):
        await create_audit_log_independent(
            user_id=None,
            action="LOGIN_FAILED",
            resource_type="User",
            ip_address=ip,
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(user.id)})
    await create_audit_log(
        db,
        user_id=user.id,
        action="LOGIN",
        resource_type="User",
        resource_id=user.id,
        ip_address=ip,
    )
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))


@router.post("/consent", response_model=UserResponse)
async def accept_consent(
    request: Request,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.consent_accepted:
        return UserResponse.model_validate(user)

    user.consent_accepted = True
    user.consent_date = datetime.utcnow()
    await db.commit()
    await db.refresh(user)

    await create_audit_log(
        db,
        user_id=user.id,
        action="CONSENT_ACCEPTED",
        resource_type="User",
        resource_id=user.id,
        ip_address=request.client.host if request.client else None,
    )
    return UserResponse.model_validate(user)


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    return UserResponse.model_validate(user)
