from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.dependencies import get_db
from app.models.task_run import TaskRun
from app.models.task import Task
from app.models.schedule import Schedule

router = APIRouter()


@router.get("/")
async def list_run_history(
    limit: int = Query(50, le=200),
    trigger_type: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(TaskRun)
        .options(
            selectinload(TaskRun.task),
            selectinload(TaskRun.schedule),
        )
        .order_by(desc(TaskRun.created_at))
        .limit(limit)
    )
    result = await db.execute(stmt)
    runs = result.scalars().all()

    def _serialize(r):
        sched = r.schedule
        t_type = sched.trigger_type if sched else "manual"
        return {
            "id": str(r.id),
            "status": r.status.upper(),
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
            "duration_seconds": r.duration_seconds,
            "log_output": r.log_output,
            "error_message": r.error_message,
            "celery_task_id": r.celery_task_id,
            "trigger_type": t_type,
            "task": {"id": str(r.task.id), "name": r.task.name} if r.task else None,
            "schedule": {"id": str(sched.id), "name": sched.name, "trigger_type": t_type} if sched else None,
        }

    serialized = [_serialize(r) for r in runs]

    # Filter by trigger_type if provided
    if trigger_type and trigger_type != "all":
        serialized = [r for r in serialized if r["trigger_type"] == trigger_type]

    return serialized


@router.post("/{run_id}/logs")
async def get_run_logs(run_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TaskRun).where(TaskRun.id == run_id))
    run = result.scalar_one_or_none()
    if not run:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Run not found")
    return {"log_output": run.log_output or "", "error_message": run.error_message}


@router.post("/record")
async def record_manual_run(
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    """
    Save a completed manual canvas run to run history.
    Called by the frontend after dry-run-stream completes.
    """
    from app.models.task_run import TaskRun
    from app.models.task import Task
    from app.models.schedule import Schedule
    from sqlalchemy import select
    from datetime import datetime, timezone

    task_id = body.get("task_id")
    schedule_id = body.get("schedule_id")
    status = body.get("status", "completed")
    log_output = body.get("log_output", "")
    duration_seconds = body.get("duration_seconds")
    started_at_str = body.get("started_at")
    error_message = body.get("error_message")

    if not task_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="task_id required")

    started_at = datetime.fromisoformat(started_at_str) if started_at_str else datetime.now(timezone.utc)
    completed_at = datetime.now(timezone.utc)

    run = TaskRun(
        task_id=UUID(task_id),
        schedule_id=UUID(schedule_id) if schedule_id else None,
        status=status,
        started_at=started_at,
        completed_at=completed_at if status != 'in_progress' else None,
        duration_seconds=duration_seconds or (completed_at - started_at).total_seconds() if status != 'in_progress' else None,
        log_output=log_output,
        error_message=error_message,
    )
    db.add(run)
    await db.commit()
    return {"id": str(run.id), "status": run.status}


@router.patch("/{run_id}")
async def update_run(
    run_id: UUID,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing run record — used to transition IN_PROGRESS → completed/failed."""
    from app.models.task_run import TaskRun
    from sqlalchemy import select
    from datetime import datetime, timezone

    result = await db.execute(select(TaskRun).where(TaskRun.id == run_id))
    run = result.scalar_one_or_none()
    if not run:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Run not found")

    if "status" in body:
        run.status = body["status"]
    if "log_output" in body:
        run.log_output = body["log_output"]
    if "duration_seconds" in body:
        run.duration_seconds = body["duration_seconds"]
    if "error_message" in body:
        run.error_message = body["error_message"]

    # Set completed_at when transitioning to terminal state
    if body.get("status") in ("completed", "failed"):
        run.completed_at = datetime.now(timezone.utc)

    await db.commit()
    return {"id": str(run.id), "status": run.status}
