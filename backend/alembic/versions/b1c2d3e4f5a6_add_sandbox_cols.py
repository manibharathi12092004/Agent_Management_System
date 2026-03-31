"""Add is_safe and sandbox_config columns to tools

Revision ID: b1c2d3e4f5a6
Revises: f36d7eef0b43
Create Date: 2026-03-27 00:00:00.000000

NOTE: This migration has already been applied to the database.
It is kept here only so Alembic can traverse the revision chain.
The actual sandbox-on-tools columns are removed by the next migration
(e1f2a3b4c5d6_migrate_sandbox_to_agents).
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision = 'b1c2d3e4f5a6'
down_revision = 'f36d7eef0b43'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('tools', sa.Column(
        'is_safe', sa.Boolean(), nullable=False, server_default='true',
    ))
    op.add_column('tools', sa.Column(
        'sandbox_config', JSONB(), nullable=False, server_default='{}',
    ))
    op.execute("""
        UPDATE tools
        SET is_safe = false,
            sandbox_config = '{"allowed_dir": "./uploads/agent_fs", "image": "flowmind-sandbox:latest", "mem_limit": "256m", "timeout_seconds": 30}'
        WHERE function_name = 'file_system'
    """)


def downgrade() -> None:
    op.drop_column('tools', 'sandbox_config')
    op.drop_column('tools', 'is_safe')
