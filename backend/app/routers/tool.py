
from uuid import UUID
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.services.tool import ToolService
from app.schemas.tool import (
    ToolResponse,
    AssignToolToAgentsRequest,
    AssignToolToAgentsResponse,
)

router = APIRouter()


# ---------------------------------------------------------
# LIST TOOLS
# ---------------------------------------------------------

@router.get("/", response_model=list[ToolResponse])
async def list_tools(
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db)
):
    service = ToolService(db)
    return await service.list_tools(active_only)


# ---------------------------------------------------------
# GET TOOL DETAILS
# ---------------------------------------------------------

@router.get("/{tool_id}", response_model=ToolResponse)
async def get_tool(
    tool_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    service = ToolService(db)
    return await service.get_tool(tool_id)


# ---------------------------------------------------------
# ASSIGN TOOL TO AGENTS
# ---------------------------------------------------------

@router.post("/{tool_id}/assign-agents",
             response_model=AssignToolToAgentsResponse)
async def assign_tool_to_agents(
    tool_id: UUID,
    body: AssignToolToAgentsRequest,
    db: AsyncSession = Depends(get_db)
):
    service = ToolService(db)

    assigned_ids = await service.assign_tool_to_agents(
        tool_id,
        body.agent_ids
    )

    return AssignToolToAgentsResponse(
        tool_id=tool_id,
        assigned_agent_ids=assigned_ids
    )