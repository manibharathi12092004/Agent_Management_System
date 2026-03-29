from __future__ import annotations

from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.llm_config import LLMConfig
from app.repositories.llm_config import LLMConfigRepository
from app.schemas.llm_config import (
    LLMConfigCreate,
    LLMConfigUpdate,
)
from app.core.security import encrypt_api_key
from app.core.exceptions import NotFoundError


class LLMConfigService:
    """
    Business logic layer for LLM configurations.
    """

    def __init__(self, db: AsyncSession):
        self.repo = LLMConfigRepository(db)

    # ------------------------------------------------------------------
    # CREATE
    # ------------------------------------------------------------------

    async def create_config(self, data: LLMConfigCreate) -> LLMConfig:
        """
        Create a new LLM configuration with encrypted API key.
        """

        # 🔐 Encrypt API key
        encrypted_key = encrypt_api_key(
            data.api_key.get_secret_value()
        )

        config = LLMConfig(
            name=data.name,
            provider=data.provider,
            api_key_encrypted=encrypted_key,
            base_url=data.base_url,
            model_name=data.model_name,
            extra_params=data.extra_params,
            is_default=False,  # handled separately
        )

        config = await self.repo.create(config)

        # ⚙️ Handle default assignment
        if data.is_default:
            config = await self.repo.set_default(config.id)

        return config

    # ------------------------------------------------------------------
    # READ
    # ------------------------------------------------------------------

    async def get_config(self, config_id: UUID) -> LLMConfig:
        config = await self.repo.get(config_id)

        if not config:
            raise NotFoundError(f"LLM config {config_id} not found")

        return config

    async def list_configs(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> list[LLMConfig]:
        return await self.repo.list_defaults_first(skip, limit)

    # ------------------------------------------------------------------
    # UPDATE
    # ------------------------------------------------------------------

    async def update_config(
        self,
        config_id: UUID,
        data: LLMConfigUpdate
    ) -> LLMConfig:

        config = await self.repo.get(config_id)

        if not config:
            raise NotFoundError(f"LLM config {config_id} not found")

        # Apply updates only if provided

        if data.name is not None:
            config.name = data.name

        if data.model_name is not None:
            config.model_name = data.model_name

        if data.base_url is not None:
            config.base_url = data.base_url

        if data.extra_params is not None:
            config.extra_params = data.extra_params

        # 🔐 API key rotation
        if data.api_key is not None:
            config.api_key_encrypted = encrypt_api_key(
                data.api_key.get_secret_value()
            )

        # ⚙️ Default flag handling
        if data.is_default is True:
            config = await self.repo.set_default(config.id)

        elif data.is_default is False and config.is_default:
            # Removing default without setting another
            config.is_default = False
            await self.repo.update(config)

        else:
            config = await self.repo.update(config)

        return config

    # ------------------------------------------------------------------
    # DELETE
    # ------------------------------------------------------------------

    async def delete_config(self, config_id: UUID) -> None:
        exists = await self.repo.delete(config_id)

        if not exists:
            raise NotFoundError(f"LLM config {config_id} not found")

    # ------------------------------------------------------------------
    # TEST CONNECTION
    # ------------------------------------------------------------------

    async def test_connection(self, config_id: UUID) -> dict:
        """Send a minimal ping to the LLM provider to verify the config works."""
        from app.core.security import decrypt_api_key

        config = await self.repo.get(config_id)
        if not config:
            raise NotFoundError(f"LLM config {config_id} not found")

        api_key = decrypt_api_key(config.api_key_encrypted)
        provider = config.provider.lower()
        model_name = config.model_name

        try:
            if provider == "gemini":
                from google import genai
                client = genai.Client(api_key=api_key)
                client.models.generate_content(
                    model=model_name,
                    contents="Reply with the single word: ok",
                )

            elif provider in ("openai", "ollama", "anthropic"):
                import openai
                base_url = config.base_url or None
                if provider == "ollama":
                    # Ensure /v1 suffix — Ollama's OpenAI-compatible endpoint
                    raw = (base_url or "http://localhost:11434").rstrip("/")
                    base_url = raw if raw.endswith("/v1") else f"{raw}/v1"
                    api_key = api_key or "ollama"
                client = openai.AsyncOpenAI(api_key=api_key, base_url=base_url)
                await client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user", "content": "Reply with the single word: ok"}],
                    max_tokens=5,
                )

            else:
                raise ValueError(f"Unsupported provider: {provider}")

            return {"status": "success", "message": "Connection successful"}

        except Exception as e:
            raise ValueError(f"Connection failed: {str(e)}")

    async def set_default(self, config_id: UUID) -> LLMConfig:
        config = await self.repo.set_default(config_id)

        if not config:
            raise NotFoundError(f"LLM config {config_id} not found")

        return config