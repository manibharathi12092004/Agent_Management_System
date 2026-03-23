from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, SecretStr, field_validator


# ---------------------------------------------------------------------
# Base schema (shared validation)
# ---------------------------------------------------------------------

class LLMConfigBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)

    provider: str = Field(
        ...,
        description="LLM provider identifier"
    )

    base_url: str | None = Field(
        None,
        max_length=500,
        description="Optional custom endpoint"
    )

    model_name: str = Field(
        ...,
        min_length=1,
        max_length=255
    )

    extra_params: dict[str, Any] = Field(
        default_factory=dict,
        description="Provider-specific parameters"
    )

    is_default: bool = Field(
        default=False,
        description="Whether this config is the system default"
    )

    # -----------------------------------------------------------------
    # Provider validation (strict allow-list)
    # -----------------------------------------------------------------

    @field_validator("provider")
    @classmethod
    def validate_provider(cls, value: str) -> str:
        allowed = {"openai", "gemini", "anthropic", "ollama"}
        v = value.lower().strip()

        if v not in allowed:
            raise ValueError(f"Provider must be one of: {', '.join(sorted(allowed))}")

        return v


# ---------------------------------------------------------------------
# Create schema
# ---------------------------------------------------------------------

class LLMConfigCreate(LLMConfigBase):
    api_key: SecretStr = Field(
        ...,
        description="Provider API key (stored encrypted)"
    )


# ---------------------------------------------------------------------
# Update schema (partial)
# ---------------------------------------------------------------------

class LLMConfigUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=255)

    api_key: SecretStr | None = Field(
        None,
        description="New API key (optional)"
    )

    model_name: str | None = Field(None, min_length=1, max_length=255)

    base_url: str | None = Field(None, max_length=500)

    extra_params: dict[str, Any] | None = None

    is_default: bool | None = None


# ---------------------------------------------------------------------
# Response schema (NO secrets)
# ---------------------------------------------------------------------

class LLMConfigResponse(BaseModel):
    id: UUID

    name: str
    provider: str

    base_url: str | None
    model_name: str
    extra_params: dict[str, Any]

    is_default: bool

    created_at: datetime
    updated_at: datetime

    # Important for ORM compatibility
    model_config = {
        "from_attributes": True
    }