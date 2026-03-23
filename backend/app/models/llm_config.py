from sqlalchemy import String, Boolean, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.mixins import UUIDMixin, TimestampMixin


class LLMConfig(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "llm_configs"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)

    api_key_encrypted: Mapped[str] = mapped_column(Text, nullable=False)

    base_url: Mapped[str | None] = mapped_column(String(500))
    model_name: Mapped[str] = mapped_column(String(255), nullable=False)

    extra_params: Mapped[dict] = mapped_column(JSONB, default=dict)

    is_default: Mapped[bool] = mapped_column(Boolean, default=False)