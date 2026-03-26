"""add file search to filesystem tool

Revision ID: a1b2c3d4e5f6
Revises: 7ec6e7722c6e
Create Date: 2026-03-26 16:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '7ec6e7722c6e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# ---------------------------------------------------------
# UPGRADE — ADD FILE SEARCH ACTION TO FILESYSTEM TOOL
# ---------------------------------------------------------

def upgrade() -> None:
    # Update the default_params JSONB field to include the new search action
    op.execute(
        """
        UPDATE tools
        SET 
            description = 'Provides safe file operations within a sandboxed directory. Supports listing files, reading files, counting lines, writing files, and searching for keywords within files.',
            default_params = jsonb_set(
                default_params,
                '{actions}',
                default_params->'actions' || '[{"id": "search", "label": "Search Files"}]'::jsonb
            ),
            updated_at = NOW()
        WHERE function_name = 'file_system'
        """
    )


# ---------------------------------------------------------
# DOWNGRADE — REMOVE FILE SEARCH ACTION
# ---------------------------------------------------------

def downgrade() -> None:
    # Remove the search action from the actions array
    op.execute(
        """
        UPDATE tools
        SET 
            description = 'Provides safe file operations within a sandboxed directory. Supports listing files, reading files, counting lines, and writing files.',
            default_params = jsonb_set(
                default_params,
                '{actions}',
                (
                    SELECT jsonb_agg(elem)
                    FROM jsonb_array_elements(default_params->'actions') elem
                    WHERE elem->>'id' != 'search'
                )
            ),
            updated_at = NOW()
        WHERE function_name = 'file_system'
        """
    )
