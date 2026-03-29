"""add_tasks_tables

Revision ID: c1d2e3f4a5b6
Revises: f36d7eef0b43
Create Date: 2026-03-28 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


# revision identifiers, used by Alembic.
revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, Sequence[str], None] = 'f36d7eef0b43'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'tasks',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    op.create_table(
        'task_workflow_steps',
        sa.Column('id', UUID(as_uuid=True), nullable=False),
        sa.Column('task_id', UUID(as_uuid=True), nullable=False),
        sa.Column('agent_id', UUID(as_uuid=True), nullable=False),
        sa.Column('step_order', sa.Integer(), nullable=False),
        sa.Column('llm_override_id', UUID(as_uuid=True), nullable=True),
        sa.Column('step_config', JSONB(), nullable=False, server_default=sa.text("'{}'")),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id']),
        sa.ForeignKeyConstraint(['llm_override_id'], ['llm_configs.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('task_id', 'step_order', name='uq_task_workflow_steps_task_id_step_order'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('task_workflow_steps')
    op.drop_table('tasks')
