"""Seed an admin user (admin@medpetrx.com / admin1) with is_admin=True."""
import asyncio
import sys
import os

# Ensure the backend directory is importable
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import select
from app.database import AsyncSessionLocal, engine
from app.models.user import User
from app.services.auth_service import hash_password


async def seed():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "admin@medpetrx.com"))
        existing = result.scalar_one_or_none()
        if existing:
            # Update existing admin user to ensure is_admin is True
            existing.is_admin = True
            existing.hashed_password = hash_password("admin1")
            existing.consent_accepted = True
            await db.commit()
            print("Admin user updated: admin@medpetrx.com")
        else:
            admin = User(
                email="admin@medpetrx.com",
                hashed_password=hash_password("admin1"),
                phone=None,
                mfa_enabled=False,
                consent_accepted=True,
                is_admin=True,
            )
            db.add(admin)
            await db.commit()
            print("Admin user created: admin@medpetrx.com / admin1")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
