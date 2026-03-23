import uuid
from sqlalchemy import String, Text, Float, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from app.db.base import Base
from app.db.mixins import UUIDMixin, TimestampMixin


class TaskRun(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "task_runs"

    schedule_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("schedules.id")
    )

    task_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id")
    )

    status: Mapped[str] = mapped_column(String(20), default="pending")

    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    duration_seconds: Mapped[float | None] = mapped_column(Float)

    celery_task_id: Mapped[str | None] = mapped_column(String(255))

    log_output: Mapped[str | None] = mapped_column(Text)
    error_message: Mapped[str | None] = mapped_column(Text)

    schedule = relationship("Schedule")
    task = relationship("Task")