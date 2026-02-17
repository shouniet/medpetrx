from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.audit_log import AuditLog


async def create_audit_log(
    db: AsyncSession,
    *,
    user_id: int | None,
    action: str,
    resource_type: str = "",
    resource_id: int | None = None,
    ip_address: str | None = None,
) -> AuditLog:
    log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=ip_address,
        timestamp=datetime.utcnow(),
    )
    db.add(log)
    await db.commit()
    return log


async def create_audit_log_independent(
    *,
    user_id: int | None,
    action: str,
    resource_type: str = "",
    resource_id: int | None = None,
    ip_address: str | None = None,
) -> None:
    """
    Write an audit log using its own DB session.
    Use this for failed-attempt logging so rollbacks don't erase the audit trail.
    """
    async with AsyncSessionLocal() as session:
        log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            timestamp=datetime.utcnow(),
        )
        session.add(log)
        await session.commit()
