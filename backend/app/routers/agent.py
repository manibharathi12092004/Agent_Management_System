# app/routers/agent.py

from __future__ import annotations

from uuid import UUID
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    Form,
    HTTPException,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.services.agent import AgentService
from app.schemas.agent import AgentCreate, AgentResponse
from app.core.exceptions import AppError


router = APIRouter()


# =========================================================
# CREATE AGENT
# Supports multipart/form-data (with optional skill file)
# =========================================================
@router.post(
    "/",
    response_model=AgentResponse,
    status_code=201,
    summary="Create agent",
)
async def create_agent(
    # ----- Form fields -----
    name: str = Form(...),
    description: Optional[str] = Form(None),
    system_prompt: Optional[str] = Form(None),
    llm_config_id: Optional[UUID] = Form(None),
    parent_agent_id: Optional[UUID] = Form(None),
    tool_ids: List[UUID] = Form(default=[]),
    is_active: bool = Form(True),

    # ----- Optional file -----
    skill_file: UploadFile | None = File(None),

    db: AsyncSession = Depends(get_db),
):
    """
    Create a new agent.

    Accepts multipart/form-data to support file upload.
    """

    service = AgentService(db)


    data = AgentCreate(
        name=name,
        description=description,
        system_prompt=system_prompt,
        llm_config_id=llm_config_id,
        parent_agent_id=parent_agent_id,
        tool_ids=tool_ids,
        is_active=is_active,
    )

    try:
        return await service.create_agent(data, skill_file)

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


# =========================================================
# LIST AGENTS (Top-level by default)
# =========================================================
@router.get(
    "/",
    response_model=List[AgentResponse],
    summary="List agents",
)
async def list_agents(
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    return await service.repo.get_top_level()


# =========================================================
# GET SINGLE AGENT
# =========================================================
@router.get(
    "/{agent_id}",
    response_model=AgentResponse,
    summary="Get agent by ID",
)
async def get_agent(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)

    agent = await service.repo.get_with_relations(agent_id)

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    return agent


# =========================================================
# UPLOAD / REPLACE SKILL FILE
# =========================================================
@router.post(
    "/{agent_id}/upload-skill",
    response_model=AgentResponse,
    summary="Upload or replace skill file",
)
async def upload_skill_file(
    agent_id: UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)

    try:
        return await service.upload_skill_file(agent_id, file)

    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)