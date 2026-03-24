"""seed predefined tools

Revision ID: 38520850e2b6
Revises: 207e01c3c026
Create Date: 2026-03-24 15:10:34.542201

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import uuid
from datetime import datetime, timezone
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '38520850e2b6'
down_revision: Union[str, Sequence[str], None] = '207e01c3c026'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ---------------------------------------------------------
# UPGRADE — INSERT FILESYSTEM TOOL
# ---------------------------------------------------------

def upgrade() -> None:
    tools_table = sa.table(
        "tools",
        sa.column("id", postgresql.UUID),
        sa.column("name", sa.String),
        sa.column("description", sa.Text),
        sa.column("tool_type", sa.String),
        sa.column("function_name", sa.String),
        sa.column("default_params", postgresql.JSONB),
        sa.column("is_active", sa.Boolean),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )

    op.bulk_insert(
        tools_table,
        [
            {
                "id": uuid.uuid4(),
                "name": "Filesystem Tool",
                "description": (
                    "Provides safe file operations within a sandboxed directory. "
                    "Supports listing files, reading files, counting lines, "
                    "and writing files."
                ),
                "tool_type": "filesystem",
                "function_name": "file_system",
                "default_params": {
                    "actions": [
                    {"id": "list", "label": "List Files"},
                    {"id": "read", "label": "Read File"},
                    {"id": "count", "label": "Count Lines"},
                    {"id": "write", "label": "Write File"}
                    ]
                },
                "is_active": True,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }
        ],
    )


# ---------------------------------------------------------
# DOWNGRADE — REMOVE SEEDED TOOL
# ---------------------------------------------------------

def downgrade() -> None:
    op.execute(
        """
        DELETE FROM tools
        WHERE function_name = 'file_system'
        """
    )