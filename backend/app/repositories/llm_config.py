from __future__ import annotations

from typing import Sequence
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.llm_config import LLMConfig
from app.repositories.base import BaseRepository


class LLMConfigRepository(BaseRepository[LLMConfig]):
    """
    Repository for LLM configuration persistence.

    Handles DB queries specific to llm_configs table.
    """

    def __init__(self, db: AsyncSession):
        super().__init__(LLMConfig, db)

    # ------------------------------------------------------------------
    # DEFAULT CONFIG
    # ------------------------------------------------------------------

    async def get_default(self) -> LLMConfig | None:
        """Return the current default LLM config."""
        result = await self.db.execute(
            select(LLMConfig).where(LLMConfig.is_default.is_(True))
        )
        return result.scalar_one_or_none()

    async def clear_default_flag(self) -> None:
        """
        Set is_default=False for all configs.

        Used before assigning a new default.
        """
        await self.db.execute(
            update(LLMConfig)
            .where(LLMConfig.is_default.is_(True))
            .values(is_default=False)
        )
        await self.db.commit()

    async def set_default(self, config_id: UUID) -> LLMConfig | None:
        """
        Make the specified config the system default.

        Enforces single-default invariant.
        """
        # Clear existing default
        await self.clear_default_flag()

        # Set new default
        result = await self.db.execute(
            select(LLMConfig).where(LLMConfig.id == config_id)
        )
        config = result.scalar_one_or_none()

        if not config:
            return None

        config.is_default = True
        await self.db.commit()
        await self.db.refresh(config)

        return config

    # ------------------------------------------------------------------
    # FILTERING / LOOKUPS
    # ------------------------------------------------------------------

    async def get_by_provider(self, provider: str) -> list[LLMConfig]:
        """Return all configs for a specific provider."""
        result = await self.db.execute(
            select(LLMConfig).where(LLMConfig.provider == provider)
        )
        return list(result.scalars().all())

    async def get_by_name(self, name: str) -> LLMConfig | None:
        """Find config by unique name."""
        result = await self.db.execute(
            select(LLMConfig).where(LLMConfig.name == name)
        )
        return result.scalar_one_or_none()

    async def list_defaults_first(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> list[LLMConfig]:
        """
        List configs with default one first.

        Useful for UI display.
        """
        result = await self.db.execute(
            select(LLMConfig)
            .order_by(LLMConfig.is_default.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())