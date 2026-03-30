"""
Test endpoints for verifying Celery + Upstash Redis integration.
Remove or protect in production.
"""

from uuid import uuid4
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db

router = APIRouter()


@router.post("/test-async-task")
async def trigger_test_task(db: AsyncSession = Depends(get_db)):
    """
    Creates a dummy TaskRun and dispatches it to Celery.
    Returns the task_run_id and celery_task_id for status polling.
    """
    from app.models.task_run import TaskRun
    from app.workers.tasks import execute_task_workflow

    # Find the first available task to use as a test
    from app.repositories.task import TaskRepository
    repo = TaskRepository(db)
    tasks = await repo.list_all()

    if not tasks:
        return {"error": "No tasks found. Create a task first."}

    task = tasks[0]

    # Create a TaskRun record
    run = TaskRun(
        task_id=task.id,
        status="pending",
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)

    # Dispatch to Celery
    celery_result = execute_task_workflow.delay(
        task_run_id=str(run.id),
        task_id=str(task.id),
    )

    # Store celery task ID
    run.celery_task_id = celery_result.id
    await db.commit()

    return {
        "task_run_id": str(run.id),
        "celery_task_id": celery_result.id,
        "task_name": task.name,
        "status": "dispatched",
    }


@router.get("/test-async-task/{celery_task_id}/status")
async def get_task_status(celery_task_id: str):
    """
    Poll Celery backend (Upstash Redis) for task state.
    """
    from app.workers.celery_app import celery_app
    from celery.result import AsyncResult

    result = AsyncResult(celery_task_id, app=celery_app)

    return {
        "celery_task_id": celery_task_id,
        "state": result.state,
        "ready": result.ready(),
        "successful": result.successful() if result.ready() else None,
        "result": str(result.result) if result.ready() else None,
    }
