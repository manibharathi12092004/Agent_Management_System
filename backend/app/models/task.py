import uuid
from sqlalchemy import String, Text, Boolean, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import UUIDMixin, TimestampMixin


class Task(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "tasks"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    steps = relationship(
        "TaskWorkflowStep",
        back_populates="task",
        order_by="TaskWorkflowStep.step_order",
        cascade="all, delete-orphan"
    )


class TaskWorkflowStep(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "task_workflow_steps"

    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id")
    )

    agent_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("agents.id")
    )

    step_order: Mapped[int] = mapped_column(Integer, nullable=False)

    llm_override_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("llm_configs.id")
    )

    step_config: Mapped[dict] = mapped_column(JSONB, default=dict)

    task = relationship("Task", back_populates="steps")
    agent = relationship("Agent", lazy="selectin")
    llm_override = relationship("LLMConfig", lazy="selectin")