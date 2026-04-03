from __future__ import annotations
from uuid import UUID
from datetime import datetime
from typing import Any
from pydantic import BaseModel, Field, field_validator
import re


# ── Cron validation ───────────────────────────────────────────────────

def _validate_cron(expr: str) -> str:
    parts = expr.strip().split()
    if len(parts) != 5:
        raise ValueError("Cron expression must have exactly 5 fields: min hour dom month dow")
    return expr.strip()


# ── Nested task in response ───────────────────────────────────────────

class StepNestedResponse(BaseModel):
    id: UUID
    step_order: int
    agent_id: UUID
    agent_name: str
    model_config = {"from_attributes": True}


class TaskNestedResponse(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    steps: list[StepNestedResponse] = []
    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, task):
        steps = []
        for s in sorted(task.steps or [], key=lambda x: x.step_order):
            steps.append(StepNestedResponse(
                id=s.id,
                step_order=s.step_order,
                agent_id=s.agent_id,
                agent_name=s.agent.name if s.agent else "",
            ))
        return cls(id=task.id, name=task.name, description=task.description, steps=steps)


# ── Create ────────────────────────────────────────────────────────────

class ScheduleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    trigger_type: str = Field(..., pattern="^(cron|folder_watch|file_watch|email|manual)$")
    cron_expression: str | None = None
    trigger_config: dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True
    task_ids: list[UUID] = Field(default_factory=list)
    email_password: str | None = None  # plaintext — encrypted by service before saving

    @field_validator("cron_expression")
    @classmethod
    def validate_cron(cls, v, info):
        if v is not None:
            _validate_cron(v)
        return v

    @field_validator("cron_expression")
    @classmethod
    def cron_required_for_cron_trigger(cls, v, info):
        # Validated after trigger_type is set
        return v


# ── Update ────────────────────────────────────────────────────────────

class ScheduleUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)
    cron_expression: str | None = None
    trigger_config: dict[str, Any] | None = None
    is_active: bool | None = None
    task_ids: list[UUID] | None = None
    email_password: str | None = None  # plaintext — encrypted by service before saving

    @field_validator("cron_expression")
    @classmethod
    def validate_cron(cls, v):
        if v is not None:
            _validate_cron(v)
        return v


# ── Response ──────────────────────────────────────────────────────────

class ScheduleResponse(BaseModel):
    id: UUID
    name: str
    trigger_type: str
    cron_expression: str | None
    trigger_config: dict[str, Any]
    is_active: bool
    tasks: list[TaskNestedResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm(cls, schedule):
        # Strip encrypted_password from trigger_config before returning to frontend
        cfg = dict(schedule.trigger_config or {})
        cfg.pop("encrypted_password", None)

        return cls(
            id=schedule.id,
            name=schedule.name,
            trigger_type=schedule.trigger_type,
            cron_expression=schedule.cron_expression,
            trigger_config=cfg,
            is_active=schedule.is_active,
            tasks=[TaskNestedResponse.from_orm(t) for t in (schedule.tasks or [])],
            created_at=schedule.created_at,
            updated_at=schedule.updated_at,
        )


# ── Toggle response ───────────────────────────────────────────────────

class ScheduleToggleResponse(BaseModel):
    id: UUID
    name: str
    is_active: bool
    message: str
