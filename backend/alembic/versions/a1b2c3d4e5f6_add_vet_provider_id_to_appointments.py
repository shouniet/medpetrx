"""add vet_provider_id to appointments

Revision ID: a1b2c3d4e5f6
Revises: df3517c516dd
Create Date: 2026-02-17 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: str = 'df3517c516dd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('appointments', sa.Column('vet_provider_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_appointments_vet_provider_id'), 'appointments', ['vet_provider_id'], unique=False)
    op.create_foreign_key(
        'fk_appointments_vet_provider_id',
        'appointments', 'vet_providers',
        ['vet_provider_id'], ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('fk_appointments_vet_provider_id', 'appointments', type_='foreignkey')
    op.drop_index(op.f('ix_appointments_vet_provider_id'), table_name='appointments')
    op.drop_column('appointments', 'vet_provider_id')
