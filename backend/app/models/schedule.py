import uuid
from sqlalchemy import String, Boolean, Integer, ForeignKey, Table, Column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import UUIDMixin, TimestampMixin


# ------------------------------
# Many-to-Many: Schedule ↔ Task
# ------------------------------

schedule_tasks = Table(
    "schedule_tasks",
    Base.metadata,
    Column("schedule_id", UUID(as_uuid=True),
           ForeignKey("schedules.id"), primary_key=True),
    Column("task_id", UUID(as_uuid=True),
           ForeignKey("tasks.id"), primary_key=True),
    Column("run_order", Integer, default=0),
)


class Schedule(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "schedules"

    name: Mapped[str] = mapped_column(String(255), nullable=False)

    cron_expression: Mapped[str | None] = mapped_column(String(100))
    trigger_type: Mapped[str] = mapped_column(String(50))

    trigger_config: Mapped[dict] = mapped_column(JSONB, default=dict)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    tasks = relationship(
        "Task",
        secondary=schedule_tasks,
        lazy="selectin"
    )