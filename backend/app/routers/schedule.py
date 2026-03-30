from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.services.schedule import ScheduleService
from app.schemas.schedule import (
    ScheduleCreate, ScheduleUpdate,
    ScheduleResponse, ScheduleToggleResponse,
)
from app.core.exceptions import AppError

router = APIRouter()


@router.get("/")
async def list_schedules(db: AsyncSession = Depends(get_db)):
    schedules = await ScheduleService(db).list_schedules()
    return [ScheduleResponse.from_orm(s) for s in schedules]


@router.post("/", status_code=201)
async def create_schedule(body: ScheduleCreate, db: AsyncSession = Depends(get_db)):
    try:
        s = await ScheduleService(db).create_schedule(body)
        return ScheduleResponse.from_orm(s)
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/{schedule_id}")
async def get_schedule(schedule_id: UUID, db: AsyncSession = Depends(get_db)):
    try:
        s = await ScheduleService(db).get_schedule(schedule_id)
        return ScheduleResponse.from_orm(s)
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.put("/{schedule_id}")
async def update_schedule(schedule_id: UUID, body: ScheduleUpdate, db: AsyncSession = Depends(get_db)):
    try:
        s = await ScheduleService(db).update_schedule(schedule_id, body)
        return ScheduleResponse.from_orm(s)
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.delete("/{schedule_id}", status_code=204)
async def delete_schedule(schedule_id: UUID, db: AsyncSession = Depends(get_db)):
    try:
        await ScheduleService(db).delete_schedule(schedule_id)
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/{schedule_id}/toggle", response_model=ScheduleToggleResponse)
async def toggle_schedule(schedule_id: UUID, db: AsyncSession = Depends(get_db)):
    try:
        s = await ScheduleService(db).toggle_schedule(schedule_id)
        return ScheduleToggleResponse(
            id=s.id, name=s.name, is_active=s.is_active,
            message=f"Schedule {'activated' if s.is_active else 'deactivated'}"
        )
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/{schedule_id}/trigger")
async def trigger_schedule_manually(schedule_id: UUID, db: AsyncSession = Depends(get_db)):
    """Manually trigger a schedule — dispatches Celery tasks for each linked task."""
    from sqlalchemy.orm import selectinload
    from sqlalchemy import select
    from app.models.schedule import Schedule
    from app.models.task_run import TaskRun
    from app.workers.tasks import execute_task_workflow

    result = await db.execute(
        select(Schedule)
        .where(Schedule.id == schedule_id)
        .options(selectinload(Schedule.tasks))
    )
    schedule = result.scalar_one_or_none()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    if not schedule.tasks:
        raise HTTPException(status_code=400, detail="Schedule has no tasks assigned")

    run_ids = []
    for task in schedule.tasks:
        run = TaskRun(
            schedule_id=schedule.id,
            task_id=task.id,
            status="pending",
        )
        db.add(run)
        await db.flush()
        celery_result = execute_task_workflow.delay(
            task_run_id=str(run.id),
            task_id=str(task.id),
        )
        run.celery_task_id = celery_result.id
        run_ids.append({"task_run_id": str(run.id), "task_id": str(task.id), "task_name": task.name})

    await db.commit()
    return {"schedule_id": str(schedule_id), "runs": run_ids}
