"""
Async DB helpers for Celery workers.

Celery runs in a sync context. These helpers use asyncio.run()
internally and create their own DB sessions — independent of
the FastAPI request lifecycle.
"""

from datetime import datetime
from uuid import UUID

from app.db.session import AsyncSessionLocal


async def update_task_run_status(
    task_run_id: str,
    status: str,
    started_at: datetime | None = None,
    completed_at: datetime | None = None,
    log_output: str | None = None,
    error_message: str | None = None,
) -> None:
    """
    Update a TaskRun record from within a Celery worker.
    Creates its own async session — safe to call with asyncio.run().
    """
    from app.models.task_run import TaskRun
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(TaskRun).where(TaskRun.id == UUID(task_run_id))
        )
        run = result.scalar_one_or_none()

        if not run:
            return

        run.status = status

        if started_at is not None:
            run.started_at = started_at

        if completed_at is not None:
            run.completed_at = completed_at
            if run.started_at:
                delta = completed_at - run.started_at
                run.duration_seconds = delta.total_seconds()

        if log_output is not None:
            run.log_output = log_output

        if error_message is not None:
            run.error_message = error_message

        await db.commit()
