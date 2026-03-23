import uuid
from sqlalchemy import String, Text, Boolean, ForeignKey, Table, Column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import UUIDMixin, TimestampMixin


# ------------------------------
# Many-to-Many: Agent ↔ Tool
# ------------------------------

agent_tools = Table(
    "agent_tools",
    Base.metadata,
    Column("agent_id", UUID(as_uuid=True),
           ForeignKey("agents.id"), primary_key=True),
    Column("tool_id", UUID(as_uuid=True),
           ForeignKey("tools.id"), primary_key=True),
)


class Agent(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "agents"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    system_prompt: Mapped[str | None] = mapped_column(Text)
    skill_file_path: Mapped[str | None] = mapped_column(String(500))

    llm_config_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("llm_configs.id")
    )

    parent_agent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agents.id")
    )

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    llm_config = relationship("LLMConfig", lazy="selectin")

    tools = relationship(
        "Tool",
        secondary=agent_tools,
        lazy="selectin"
    )

    children = relationship(
        "Agent",
        back_populates="parent",
        foreign_keys=[parent_agent_id]
    )

    parent = relationship(
        "Agent",
        back_populates="children",
        remote_side="Agent.id"
    )