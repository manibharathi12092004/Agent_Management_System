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
from app.services.domain import DomainService
from app.schemas.agent import AgentCreate, AgentResponse
from app.core.exceptions import AppError
from app.schemas.agent import DryRunRequest, DryRunResponse
from app.schemas.domain import SuggestDomainRequest, SuggestDomainResponse


router = APIRouter()


# =========================================================
# SUGGEST DOMAIN FOR AGENT (LLM-based)
# Static path — must be declared BEFORE /{agent_id} routes
# =========================================================
@router.post(
    "/suggest-domain",
    response_model=SuggestDomainResponse,
    summary="Suggest domain for a new agent using LLM",
)
async def suggest_domain(
    body: SuggestDomainRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Use LLM to suggest which domain a new agent should belong to.
    Creates a new domain if none of the existing ones fit.
    """
    service = DomainService(db)
    try:
        return await service.suggest_domain(body)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================
# LIST AGENTS
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
    name: str = Form(...),
    description: Optional[str] = Form(None),
    system_prompt: Optional[str] = Form(None),
    llm_config_id: Optional[UUID] = Form(None),
    parent_agent_id: Optional[UUID] = Form(None),
    domain_id: Optional[UUID] = Form(None),
    tool_ids: List[UUID] = Form(default=[]),
    is_active: bool = Form(True),
    skill_file: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    data = AgentCreate(
        name=name,
        description=description,
        system_prompt=system_prompt,
        llm_config_id=llm_config_id,
        parent_agent_id=parent_agent_id,
        domain_id=domain_id,
        tool_ids=tool_ids,
        is_active=is_active,
    )
    try:
        return await service.create_agent(data, skill_file)
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


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
# DELETE AGENT
# =========================================================
@router.delete(
    "/{agent_id}",
    status_code=204,
    summary="Delete agent",
)
async def delete_agent(
    agent_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    agent = await service.repo.get(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    await db.delete(agent)
    await db.commit()


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


# =========================================================
# DRY RUN AGENT
# =========================================================
@router.post(
    "/{agent_id}/dry-run",
    response_model=DryRunResponse,
    summary="Dry-run agent synchronously",
)
async def dry_run_agent(
    agent_id: UUID,
    body: DryRunRequest,
    db: AsyncSession = Depends(get_db),
):
    service = AgentService(db)
    try:
        return await service.dry_run(agent_id, body)
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
