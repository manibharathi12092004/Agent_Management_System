from __future__ import annotations

from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.services.task import TaskService
from app.schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    AutoSuggestRequest,
    AutoSuggestResponse,
    DryRunRequest,
    DryRunResponse,
)
from app.core.exceptions import AppError

router = APIRouter()


# =========================================================
# AUTO-SUGGEST — static path BEFORE /{task_id} routes
# =========================================================
@router.post(
    "/auto-suggest",
    response_model=AutoSuggestResponse,
    summary="Auto-suggest agent workflow steps using LLM",
)
async def auto_suggest(
    body: AutoSuggestRequest,
    db: AsyncSession = Depends(get_db),
):
    service = TaskService(db)
    try:
        return await service.auto_suggest(body)
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


# =========================================================
# LIST TASKS
# =========================================================
@router.get(
    "/",
    response_model=List[TaskResponse],
    summary="List all tasks",
)
async def list_tasks(db: AsyncSession = Depends(get_db)):
    service = TaskService(db)
    try:
        return await service.list_tasks()
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


# =========================================================
# CREATE TASK
# =========================================================
@router.post(
    "/",
    response_model=TaskResponse,
    status_code=201,
    summary="Create a new task",
)
async def create_task(
    body: TaskCreate,
    db: AsyncSession = Depends(get_db),
):
    service = TaskService(db)
    try:
        return await service.create_task(body)
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


# =========================================================
# GET SINGLE TASK
# =========================================================
@router.get(
    "/{task_id}",
    response_model=TaskResponse,
    summary="Get task by ID",
)
async def get_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    service = TaskService(db)
    try:
        return await service.get_task(task_id)
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


# =========================================================
# UPDATE TASK
# =========================================================
@router.put(
    "/{task_id}",
    response_model=TaskResponse,
    summary="Update task",
)
async def update_task(
    task_id: UUID,
    body: TaskUpdate,
    db: AsyncSession = Depends(get_db),
):
    service = TaskService(db)
    try:
        return await service.update_task(task_id, body)
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


# =========================================================
# DELETE TASK
# =========================================================
@router.delete(
    "/{task_id}",
    status_code=204,
    summary="Delete task",
)
async def delete_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    service = TaskService(db)
    try:
        await service.delete_task(task_id)
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


# =========================================================
# DRY RUN TASK — streaming (step-by-step results)
# =========================================================
@router.post(
    "/{task_id}/dry-run-stream",
    summary="Dry-run task workflow with streaming step results",
)
async def dry_run_task_stream(
    task_id: UUID,
    body: DryRunRequest,
    db: AsyncSession = Depends(get_db),
):
    from fastapi.responses import StreamingResponse
    import json as _json

    service = TaskService(db)

    async def generate():
        try:
            async for step_result in service.dry_run_stream(task_id, body):
                yield f"data: {_json.dumps(step_result)}\n\n"
            yield "data: [DONE]\n\n"
        except AppError as e:
            yield f"data: {_json.dumps({'error': e.message})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


# =========================================================
# DRY RUN TASK — synchronous (returns full results at once)
# =========================================================
@router.post(
    "/{task_id}/dry-run",
    response_model=DryRunResponse,
    summary="Dry-run task workflow synchronously",
)
async def dry_run_task(
    task_id: UUID,
    body: DryRunRequest,
    db: AsyncSession = Depends(get_db),
):
    service = TaskService(db)
    try:
        return await service.dry_run(task_id, body)
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
