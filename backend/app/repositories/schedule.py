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
        from sqlalchemy.orm import contains_eager
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
        schedule = result.scalar_one_or_none()
        # Re-sort tasks by run_order from the join table
        if schedule and schedule.tasks:
            from sqlalchemy import select as sa_select
            order_result = await self.db.execute(
                sa_select(schedule_tasks.c.task_id, schedule_tasks.c.run_order)
                .where(schedule_tasks.c.schedule_id == schedule_id)
                .order_by(schedule_tasks.c.run_order)
            )
            order_map = {str(row.task_id): row.run_order for row in order_result}
            schedule.tasks.sort(key=lambda t: order_map.get(str(t.id), 0))
        return schedule

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
        schedules = list(result.scalars().all())

        # Sort each schedule's tasks by run_order
        if schedules:
            sched_ids = [s.id for s in schedules]
            order_result = await self.db.execute(
                select(schedule_tasks.c.schedule_id, schedule_tasks.c.task_id, schedule_tasks.c.run_order)
                .where(schedule_tasks.c.schedule_id.in_(sched_ids))
                .order_by(schedule_tasks.c.run_order)
            )
            order_map: dict[str, dict[str, int]] = {}
            for row in order_result:
                sid = str(row.schedule_id)
                if sid not in order_map:
                    order_map[sid] = {}
                order_map[sid][str(row.task_id)] = row.run_order

            for s in schedules:
                if s.tasks and str(s.id) in order_map:
                    s.tasks.sort(key=lambda t: order_map[str(s.id)].get(str(t.id), 0))

        return schedules

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

    async def list_active_watch(self) -> list[Schedule]:
        """Return active folder_watch and file_watch schedules — used by WatcherManager."""
        stmt = (
            select(Schedule)
            .where(Schedule.is_active.is_(True))
            .where(Schedule.trigger_type.in_(["folder_watch", "file_watch"]))
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
