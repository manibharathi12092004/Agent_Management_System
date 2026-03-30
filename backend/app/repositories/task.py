from __future__ import annotations

from uuid import UUID

from sqlalchemy import select, delete as sa_delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.task import Task, TaskWorkflowStep
from app.models.agent import Agent
from app.repositories.base import BaseRepository


class TaskRepository(BaseRepository[Task]):
    """Repository for Task and TaskWorkflowStep persistence."""

    def __init__(self, db: AsyncSession):
        super().__init__(Task, db)

    async def get_with_steps(self, task_id: UUID) -> Task | None:
        """Single query with selectinload for steps → agent → tools, llm_override."""
        stmt = (
            select(Task)
            .where(Task.id == task_id)
            .options(
                selectinload(Task.steps).options(
                    selectinload(TaskWorkflowStep.agent).selectinload(Agent.tools),
                    selectinload(TaskWorkflowStep.llm_override),
                )
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_all(self) -> list[Task]:
        """List tasks with steps loaded for step count display."""
        stmt = (
            select(Task)
            .options(selectinload(Task.steps))
            .order_by(Task.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_by_ids(self, task_ids: list[UUID]) -> list[Task]:
        """Bulk fetch tasks by IDs."""
        if not task_ids:
            return []
        stmt = select(Task).where(Task.id.in_(task_ids))
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def replace_steps(self, task: Task, new_steps: list[TaskWorkflowStep]) -> Task:
        """Delete all existing steps and insert new ones atomically (no intermediate commit)."""
        await self.db.execute(
            sa_delete(TaskWorkflowStep).where(TaskWorkflowStep.task_id == task.id)
        )
        for step in new_steps:
            self.db.add(step)
        await self.db.flush()
        await self.db.refresh(task)
        return task
