"""add_domains_table

Revision ID: f36d7eef0b43
Revises: a1b2c3d4e5f6
Create Date: 2026-03-27 12:21:31.530612

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f36d7eef0b43'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create domains table
    op.create_table(
        'domains',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('agent_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    
    # Create indexes
    op.create_index('ix_domains_name', 'domains', ['name'])
    
    # Add domain_id column to agents table
    op.add_column('agents', sa.Column('domain_id', sa.UUID(), nullable=True))
    op.create_foreign_key(
        'fk_agents_domain_id',
        'agents', 'domains',
        ['domain_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_index('ix_agents_domain_id', 'agents', ['domain_id'])


def downgrade() -> None:
    """Downgrade schema."""
    # Remove domain_id from agents
    op.drop_index('ix_agents_domain_id', 'agents')
    op.drop_constraint('fk_agents_domain_id', 'agents', type_='foreignkey')
    op.drop_column('agents', 'domain_id')
    
    # Drop domains table
    op.drop_index('ix_domains_name', 'domains')
    op.drop_table('domains')
