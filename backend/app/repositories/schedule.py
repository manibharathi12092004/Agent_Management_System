from __future__ import annotations
from uuid import UUID
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.schedule import Schedule, schedule_tasks
from app.repositories.base import BaseRepository


from sqlalchemy.orm import selectinload

class ScheduleRepository(BaseRepository[Schedule]):

    def __init__(self, db: AsyncSession):
        super().__init__(Schedule, db)

    async def get_with_tasks(self, schedule_id: UUID) -> Schedule | None:
        from app.models.task import Task, TaskWorkflowStep
        stmt = (
            select(Schedule)
            .where(Schedule.id == schedule_id)
            .options(
                selectinload(Schedule.tasks)
                .selectinload(Task.steps)
                .selectinload(TaskWorkflowStep.agent)
            )
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_all(self) -> list[Schedule]:
        from app.models.task import Task, TaskWorkflowStep
        stmt = (
            select(Schedule)
            .options(
                selectinload(Schedule.tasks)
                .selectinload(Task.steps)
                .selectinload(TaskWorkflowStep.agent)
            )
            .order_by(Schedule.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def list_active_cron(self) -> list[Schedule]:
        """Return only active cron schedules — used by Celery Beat."""
        stmt = (
            select(Schedule)
            .where(Schedule.is_active.is_(True))
            .where(Schedule.trigger_type == "cron")
            .options(selectinload(Schedule.tasks))
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def replace_tasks(self, schedule_id: UUID, task_ids: list[UUID]) -> None:
        """Replace all task associations for a schedule."""
        # Delete existing
        await self.db.execute(
            delete(schedule_tasks).where(
                schedule_tasks.c.schedule_id == schedule_id
            )
        )
        # Insert new with run_order
        for i, task_id in enumerate(task_ids):
            await self.db.execute(
                schedule_tasks.insert().values(
                    schedule_id=schedule_id,
                    task_id=task_id,
                    run_order=i,
                )
            )
        await self.db.flush()
