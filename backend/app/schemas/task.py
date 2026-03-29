from __future__ import annotations

from uuid import UUID
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, ConfigDict, model_validator


# ── Step ─────────────────────────────────────────────────────────────

class TaskStepCreate(BaseModel):
    agent_id: UUID
    step_order: int = Field(..., ge=1)
    llm_override_id: UUID | None = None
    step_config: dict[str, Any] = Field(default_factory=dict)


class TaskStepResponse(BaseModel):
    id: UUID
    step_order: int
    agent_id: UUID
    agent_name: str
    llm_override_id: UUID | None
    step_config: dict[str, Any]

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def extract_agent_name(cls, values):
        if hasattr(values, "agent") and values.agent is not None:
            values.__dict__["agent_name"] = values.agent.name
        return values


# ── Task ─────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    steps: list[TaskStepCreate] = Field(default_factory=list)

    @model_validator(mode="after")
    def no_duplicate_step_orders(self) -> "TaskCreate":
        orders = [s.step_order for s in self.steps]
        if len(orders) != len(set(orders)):
            raise ValueError("Duplicate step_order values are not allowed")
        return self


class TaskUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    is_active: bool | None = None
    steps: list[TaskStepCreate] | None = None


class TaskResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    is_active: bool
    steps: list[TaskStepResponse]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Auto-Suggest ──────────────────────────────────────────────────────

class AutoSuggestRequest(BaseModel):
    task_description: str = Field(..., min_length=1, max_length=2000)


class SuggestedStep(BaseModel):
    agent_id: UUID
    agent_name: str
    reason: str
    step_order: int


class AutoSuggestResponse(BaseModel):
    steps: list[SuggestedStep]


# ── Dry Run ───────────────────────────────────────────────────────────

class DryRunRequest(BaseModel):
    input_data: dict[str, Any] = Field(default_factory=dict)


class StepResult(BaseModel):
    step_order: int
    agent_id: UUID
    agent_name: str
    output: str
    duration_ms: int
    error: str | None = None
    skipped: bool = False


class DryRunResponse(BaseModel):
    task_id: UUID
    task_name: str
    results: list[StepResult]
    total_duration_ms: int
