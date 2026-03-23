from __future__ import annotations

from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.services.llm_config import LLMConfigService
from app.schemas.llm_config import (
    LLMConfigCreate,
    LLMConfigUpdate,
    LLMConfigResponse,
)


router = APIRouter()


# ---------------------------------------------------------------------
# CREATE
# ---------------------------------------------------------------------

@router.post(
    "/",
    response_model=LLMConfigResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_llm_config(
    data: LLMConfigCreate,
    db: AsyncSession = Depends(get_db),
):
    service = LLMConfigService(db)
    config = await service.create_config(data)
    return config


# ---------------------------------------------------------------------
# LIST
# ---------------------------------------------------------------------

@router.get(
    "/",
    response_model=List[LLMConfigResponse],
)
async def list_llm_configs(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    service = LLMConfigService(db)
    return await service.list_configs(skip, limit)


# ---------------------------------------------------------------------
# GET SINGLE
# ---------------------------------------------------------------------

@router.get(
    "/{config_id}",
    response_model=LLMConfigResponse,
)
async def get_llm_config(
    config_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    service = LLMConfigService(db)
    return await service.get_config(config_id)


# ---------------------------------------------------------------------
# UPDATE
# ---------------------------------------------------------------------

@router.put(
    "/{config_id}",
    response_model=LLMConfigResponse,
)
async def update_llm_config(
    config_id: UUID,
    data: LLMConfigUpdate,
    db: AsyncSession = Depends(get_db),
):
    service = LLMConfigService(db)
    return await service.update_config(config_id, data)


# ---------------------------------------------------------------------
# DELETE
# ---------------------------------------------------------------------

@router.delete(
    "/{config_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_llm_config(
    config_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    service = LLMConfigService(db)
    await service.delete_config(config_id)
    return None


# ---------------------------------------------------------------------
# SET DEFAULT
# ---------------------------------------------------------------------

@router.post(
    "/{config_id}/set-default",
    response_model=LLMConfigResponse,
)
async def set_default_llm_config(
    config_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    service = LLMConfigService(db)
    return await service.set_default(config_id)