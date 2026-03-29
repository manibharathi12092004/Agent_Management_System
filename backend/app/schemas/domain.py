from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime


# ============================================
# Domain Schemas
# ============================================

class DomainBase(BaseModel):
    """Base domain schema"""
    name: str = Field(..., max_length=255, description="Domain name")
    description: str | None = Field(None, description="Domain description")


class DomainCreate(DomainBase):
    """Schema for creating a domain"""
    pass


class DomainUpdate(BaseModel):
    """Schema for updating a domain"""
    name: str | None = Field(None, max_length=255)
    description: str | None = None


class DomainResponse(DomainBase):
    """Schema for domain response"""
    id: UUID
    agent_count: int = Field(default=0, description="Number of agents in this domain")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Domain Suggestion Schemas (LLM-based)
# ============================================

class SuggestDomainRequest(BaseModel):
    """Request schema for LLM-based domain suggestion"""
    agent_name: str = Field(..., description="Name of the agent")
    skill_description: str | None = Field(None, description="Agent's skill or purpose description")
    system_prompt: str | None = Field(None, description="Agent's system prompt")


class SuggestDomainResponse(BaseModel):
    """Response schema for domain suggestion"""
    domain_id: UUID | None = Field(None, description="ID of the suggested domain")
    domain_name: str = Field(..., description="Name of the suggested domain")
    is_new_domain: bool = Field(..., description="Whether a new domain was created")
    reasoning: str | None = Field(None, description="LLM's reasoning for the suggestion")
