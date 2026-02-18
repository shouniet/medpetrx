"""add vet_clinic_refs table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-02-17 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: str = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'vet_clinic_refs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('clinic_name', sa.String(300), nullable=False, index=True),
        sa.Column('veterinarian_name', sa.String(200), nullable=True),
        sa.Column('phone', sa.String(30), nullable=True),
        sa.Column('email', sa.String(200), nullable=True),
        sa.Column('address', sa.String(500), nullable=True),
        sa.Column('city', sa.String(100), nullable=True, index=True),
        sa.Column('state', sa.String(2), nullable=False, server_default='MA'),
        sa.Column('zip_code', sa.String(10), nullable=True),
        sa.Column('website', sa.String(300), nullable=True),
        sa.Column('specialty', sa.String(200), nullable=True),
        sa.Column('services', sa.Text(), nullable=True),
        sa.Column('is_emergency', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('vet_clinic_refs')
