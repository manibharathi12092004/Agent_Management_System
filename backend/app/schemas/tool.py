from uuid import UUID
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ---------------------------------------------------------
# RESPONSE SCHEMA
# ---------------------------------------------------------

class ToolResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    tool_type: str
    function_name: str
    default_params: dict[str, Any]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------
# AGENT ASSIGNMENT SCHEMAS
# ---------------------------------------------------------

class AssignToolToAgentsRequest(BaseModel):
    agent_ids: list[UUID] = Field(..., min_length=1)


class AssignToolToAgentsResponse(BaseModel):
    tool_id: UUID
    assigned_agent_ids: list[UUID]
