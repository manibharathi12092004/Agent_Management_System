
from __future__ import annotations

from uuid import UUID
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.agent import Agent
from app.models.domain import Domain
from app.repositories.base import BaseRepository


class AgentRepository(BaseRepository[Agent]):
    """
    Repository for Agent entities.

    Responsibilities:
    - Pure database access
    - No business logic
    - Optimized eager loading
    """

    def __init__(self, db: AsyncSession):
        super().__init__(Agent, db)

    # =========================================================
    # Get Top-Level Agents (no parent)
    # =========================================================
    async def get_top_level(
        self,
        active_only: bool = True
    ) -> List[Agent]:
        """
        Returns root agents (parent_agent_id IS NULL).

        Used for:
        - Sidebar tree
        - Agent explorer
        - Root-level listing
        """

        stmt = (
            select(Agent)
            .where(Agent.parent_agent_id.is_(None))
            .options(
                selectinload(Agent.tools),
                selectinload(Agent.llm_config),
                selectinload(Agent.children),
                selectinload(Agent.domain),
            )
            .order_by(Agent.created_at)
        )

        if active_only:
            stmt = stmt.where(Agent.is_active.is_(True))

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # =========================================================
    # Get Children by Parent ID
    # =========================================================
    async def get_by_parent(
        self,
        parent_id: UUID,
        active_only: bool = True
    ) -> List[Agent]:
        """
        Returns direct child agents of a parent agent.
        """

        stmt = (
            select(Agent)
            .where(Agent.parent_agent_id == parent_id)
            .options(
                selectinload(Agent.tools),
                selectinload(Agent.llm_config),
                selectinload(Agent.children),
                selectinload(Agent.domain),
            )
            .order_by(Agent.created_at)
        )

        if active_only:
            stmt = stmt.where(Agent.is_active.is_(True))

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # =========================================================
    # Get Agents by List of IDs (Bulk Fetch)
    # =========================================================
    async def get_by_ids(
        self,
        ids: List[UUID],
        active_only: bool = False
    ) -> List[Agent]:
        """
        Bulk fetch agents by IDs.

        Used for:
        - Tool assignment
        - Workflow building
        - Execution planning
        """

        if not ids:
            return []

        stmt = (
            select(Agent)
            .where(Agent.id.in_(ids))
            .options(
                selectinload(Agent.tools),
                selectinload(Agent.llm_config),
                selectinload(Agent.children),
                selectinload(Agent.domain),
            )
        )

        if active_only:
            stmt = stmt.where(Agent.is_active.is_(True))

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    # =========================================================
    # Get Single Agent with All Relations
    # =========================================================
    async def get_with_relations(
        self,
        agent_id: UUID
    ) -> Optional[Agent]:
        """
        Fetch a single agent with tools, LLM config, parent, and children.

        Essential for:
        - Agent detail view
        - Dry run preparation
        - Execution engine
        """

        stmt = (
            select(Agent)
            .where(Agent.id == agent_id)
            .options(
                selectinload(Agent.tools),
                selectinload(Agent.llm_config),
                selectinload(Agent.children),
                selectinload(Agent.parent),
                selectinload(Agent.domain),
            )
        )

        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()