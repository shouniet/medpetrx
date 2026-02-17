"""
Seed the common_medication_refs table from the hardcoded COMMON_MEDICATIONS list.
Run once after migration:  python -m app.seed_common_meds
"""

import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal, engine, Base
from app.models.common_medication_ref import CommonMedicationRef
from app.services.common_medications import COMMON_MEDICATIONS


async def seed():
    async with AsyncSessionLocal() as session:
        # Check if already seeded
        result = await session.execute(select(CommonMedicationRef).limit(1))
        if result.scalars().first() is not None:
            print("Table already has data — skipping seed.")
            return

        for med in COMMON_MEDICATIONS:
            row = CommonMedicationRef(
                drug_name=med["drug_name"],
                drug_class=med["drug_class"],
                species=med["species"],
                common_indications=med["common_indications"],
                typical_dose=med.get("typical_dose"),
                route=med.get("route"),
                common_side_effects=med["common_side_effects"],
                warnings=med.get("warnings"),
            )
            session.add(row)

        await session.commit()
        print(f"Seeded {len(COMMON_MEDICATIONS)} common medications.")


if __name__ == "__main__":
    asyncio.run(seed())
