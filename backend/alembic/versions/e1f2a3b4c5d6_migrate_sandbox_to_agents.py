"""Migrate sandbox from tools to agents

Revision ID: e1f2a3b4c5d6
Revises: b1c2d3e4f5a6
Create Date: 2026-03-31 23:00:00.000000

DB state when this runs:
  - tools table HAS: is_safe (bool), sandbox_config (jsonb)
  - agents table does NOT have: run_in_sandbox, sandbox_config

This migration:
  1. Adds run_in_sandbox + sandbox_config to agents
  2. Drops is_safe + sandbox_config from tools
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


revision = 'e1f2a3b4c5d6'
down_revision = 'b1c2d3e4f5a6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add sandbox fields to agents
    op.add_column('agents', sa.Column(
        'run_in_sandbox',
        sa.Boolean(),
        nullable=False,
        server_default='false',
    ))
    op.add_column('agents', sa.Column(
        'sandbox_config',
        JSONB(),
        nullable=False,
        server_default='{}',
    ))

    # 2. Drop sandbox fields from tools
    op.drop_column('tools', 'sandbox_config')
    op.drop_column('tools', 'is_safe')


def downgrade() -> None:
    # Restore sandbox fields to tools
    op.add_column('tools', sa.Column(
        'is_safe',
        sa.Boolean(),
        nullable=False,
        server_default='true',
    ))
    op.add_column('tools', sa.Column(
        'sandbox_config',
        JSONB(),
        nullable=False,
        server_default='{}',
    ))

    # Remove sandbox fields from agents
    op.drop_column('agents', 'sandbox_config')
    op.drop_column('agents', 'run_in_sandbox')
