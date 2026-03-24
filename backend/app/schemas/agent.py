
from __future__ import annotations

from uuid import UUID
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, ConfigDict


# =========================================================
# Nested Tool Schema (minimal view for Agent responses)
# =========================================================

class ToolNestedResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    function_name: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# Agent Create Schema (JSON version)
# =========================================================

class AgentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)

    description: Optional[str] = None

    system_prompt: Optional[str] = Field(
        None,
        description="Inline system prompt (optional if skill file used)"
    )

    llm_config_id: Optional[UUID] = Field(
        None,
        description="If None → default LLM config will be used"
    )

    parent_agent_id: Optional[UUID] = Field(
        None,
        description="For hierarchical agent structure"
    )

    tool_ids: List[UUID] = Field(
        default_factory=list,
        description="Tools assigned to this agent"
    )

    is_active: bool = True


# =========================================================
# Agent Update Schema (Partial Update)
# =========================================================

class AgentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)

    description: Optional[str] = None

    system_prompt: Optional[str] = None

    llm_config_id: Optional[UUID] = None

    parent_agent_id: Optional[UUID] = None

    tool_ids: Optional[List[UUID]] = None

    is_active: Optional[bool] = None


# =========================================================
# Base Response Fields (shared)
# =========================================================

class AgentBaseResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]

    system_prompt: Optional[str]
    skill_file_path: Optional[str]

    llm_config_id: Optional[UUID]
    parent_agent_id: Optional[UUID]

    tools: List[ToolNestedResponse] = []

    is_active: bool

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# Flat Agent Response
# =========================================================

class AgentResponse(AgentBaseResponse):
    pass


# =========================================================
# Hierarchical Agent Tree Response (recursive)
# =========================================================

class AgentTreeResponse(AgentBaseResponse):
    children: List["AgentTreeResponse"] = []


# Fix forward references for recursive model
AgentTreeResponse.model_rebuild()