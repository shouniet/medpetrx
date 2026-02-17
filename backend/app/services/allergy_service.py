from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.allergy import Allergy, AllergyType


async def check_medication_against_allergies(
    db: AsyncSession,
    pet_id: int,
    drug_name: str,
) -> list[Allergy]:
    """
    Returns drug allergies whose substance_name contains the drug_name (case-insensitive).
    """
    result = await db.execute(
        select(Allergy).where(
            Allergy.pet_id == pet_id,
            Allergy.allergy_type == AllergyType.DRUG,
            func.lower(Allergy.substance_name).contains(drug_name.lower()),
        )
    )
    return result.scalars().all()
