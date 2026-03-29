"""seed_web_tools

Revision ID: 7ec6e7722c6e
Revises: 38520850e2b6
Create Date: 2026-03-25 18:14:56.143204

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import uuid
from datetime import datetime, timezone
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '7ec6e7722c6e'
down_revision: Union[str, Sequence[str], None] = '38520850e2b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ---------------------------------------------------------
# UPGRADE — INSERT WEB TOOLS
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

    now = datetime.now(timezone.utc)

    op.bulk_insert(
        tools_table,
        [
            # -------------------------------------------------
            # 🌐 UNIFIED WEB TOOL
            # -------------------------------------------------
            {
                "id": uuid.uuid4(),
                "name": "Web Tool",
                "description": (
                    "Unified web operations tool. "
                    "Supports searching the web for real-time information."
                ),
                "tool_type": "external",
                "function_name": "web_tool",
                "default_params": {
                    "actions": [
                        {"id": "search", "label": "Web Search", "description": "Search the web for real-time information"}
                    ]
                },
                "is_active": True,
                "created_at": now,
                "updated_at": now,
            },
        ],
    )


# ---------------------------------------------------------
# DOWNGRADE — REMOVE SEEDED TOOLS
# ---------------------------------------------------------

def downgrade() -> None:
    op.execute(
        """
        DELETE FROM tools
        WHERE function_name IN ('web_tool', 'fetch_url_content')
        """
    )