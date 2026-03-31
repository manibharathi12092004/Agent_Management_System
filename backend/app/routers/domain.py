from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.services.domain import DomainService
from app.schemas.domain import (
    DomainCreate,
    DomainUpdate,
    DomainResponse
)
from app.schemas.agent import AgentResponse
from app.core.exceptions import AppError

router = APIRouter()


# =========================================================
# LIST ALL DOMAINS
# =========================================================

@router.get("/", response_model=list[DomainResponse])
async def list_domains(
    db: AsyncSession = Depends(get_db)
):
    """
    Get all domains with agent counts.
    """
    service = DomainService(db)
    domains = await service.get_all_domains()
    return domains


# =========================================================
# GET SINGLE DOMAIN
# =========================================================

@router.get("/{domain_id}", response_model=DomainResponse)
async def get_domain(
    domain_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a single domain by ID.
    """
    service = DomainService(db)
    
    try:
        domain = await service.get_domain(domain_id)
        return domain
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


# =========================================================
# GET AGENTS IN DOMAIN
# =========================================================

@router.get("/{domain_id}/agents", response_model=list[AgentResponse])
async def get_domain_agents(
    domain_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Get all agents in a specific domain.
    """
    service = DomainService(db)
    
    try:
        agents = await service.get_domain_agents(domain_id)
        
        # Format response with domain info
        response = []
        for agent in agents:
            agent_dict = {
                "id": agent.id,
                "name": agent.name,
                "description": agent.description,
                "system_prompt": agent.system_prompt,
                "skill_file_path": agent.skill_file_path,
                "llm_config_id": agent.llm_config_id,
                "parent_agent_id": agent.parent_agent_id,
                "domain_id": agent.domain_id,
                "domain_name": agent.domain.name if agent.domain else None,
                "tools": agent.tools,
                "is_active": agent.is_active,
                "run_in_sandbox": agent.run_in_sandbox,
                "sandbox_config": agent.sandbox_config,
                "created_at": agent.created_at,
                "updated_at": agent.updated_at
            }
            response.append(agent_dict)
        
        return response
    
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


# =========================================================
# CREATE DOMAIN
# =========================================================

@router.post("/", response_model=DomainResponse, status_code=201)
async def create_domain(
    data: DomainCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new domain.
    """
    service = DomainService(db)
    
    try:
        domain = await service.create_domain(data)
        return domain
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


# =========================================================
# UPDATE DOMAIN
# =========================================================

@router.put("/{domain_id}", response_model=DomainResponse)
async def update_domain(
    domain_id: UUID,
    data: DomainUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update a domain.
    """
    service = DomainService(db)
    
    try:
        domain = await service.update_domain(domain_id, data)
        return domain
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


# =========================================================
# DELETE DOMAIN
# =========================================================

@router.delete("/{domain_id}", status_code=204)
async def delete_domain(
    domain_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a domain. All agents in this domain will have their domain_id set to NULL.
    """
    service = DomainService(db)
    
    try:
        await service.delete_domain(domain_id)
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
