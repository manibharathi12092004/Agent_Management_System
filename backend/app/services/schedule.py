from __future__ import annotations
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.schedule import Schedule
from app.repositories.schedule import ScheduleRepository
from app.repositories.task import TaskRepository
from app.schemas.schedule import ScheduleCreate, ScheduleUpdate
from app.core.exceptions import NotFoundError, ValidationError


def _encrypt_email_password(data_dict: dict) -> dict:
    """If email trigger with plaintext password, encrypt it before saving."""
    if data_dict.get("trigger_type") == "email":
        plaintext = data_dict.pop("email_password", None)
        if plaintext:
            from app.core.security import encrypt_api_key
            cfg = dict(data_dict.get("trigger_config") or {})
            cfg["encrypted_password"] = encrypt_api_key(plaintext)
            data_dict["trigger_config"] = cfg
    return data_dict


class ScheduleService:

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ScheduleRepository(db)
        self.task_repo = TaskRepository(db)

    async def create_schedule(self, data: ScheduleCreate) -> Schedule:
        # Validate cron required for cron trigger
        if data.trigger_type == "cron" and not data.cron_expression:
            raise ValidationError("cron_expression is required for cron trigger type")

        # Validate task IDs exist
        if data.task_ids:
            tasks = await self.task_repo.get_by_ids(data.task_ids)
            if len(tasks) != len(data.task_ids):
                raise ValidationError("One or more task IDs not found")

        # Encrypt email password if provided
        trigger_config = dict(data.trigger_config or {})
        if data.trigger_type == "email" and data.email_password:
            from app.core.security import encrypt_api_key
            trigger_config["encrypted_password"] = encrypt_api_key(data.email_password)

        schedule = Schedule(
            name=data.name,
            trigger_type=data.trigger_type,
            cron_expression=data.cron_expression,
            trigger_config=trigger_config,
            is_active=data.is_active,
        )
        self.db.add(schedule)
        await self.db.flush()  # get schedule.id

        if data.task_ids:
            await self.repo.replace_tasks(schedule.id, data.task_ids)

        await self.db.commit()
        return await self.repo.get_with_tasks(schedule.id)

    async def get_schedule(self, schedule_id: UUID) -> Schedule:
        schedule = await self.repo.get_with_tasks(schedule_id)
        if not schedule:
            raise NotFoundError(f"Schedule {schedule_id} not found")
        return schedule

    async def list_schedules(self) -> list[Schedule]:
        return await self.repo.list_all()

    async def update_schedule(self, schedule_id: UUID, data: ScheduleUpdate) -> Schedule:
        schedule = await self.repo.get_with_tasks(schedule_id)
        if not schedule:
            raise NotFoundError(f"Schedule {schedule_id} not found")

        if data.name is not None:
            schedule.name = data.name
        if data.cron_expression is not None:
            schedule.cron_expression = data.cron_expression
        if data.trigger_config is not None:
            trigger_config = dict(data.trigger_config)
            # Preserve existing encrypted_password if no new password provided
            if schedule.trigger_type == "email":
                if data.email_password:
                    from app.core.security import encrypt_api_key
                    trigger_config["encrypted_password"] = encrypt_api_key(data.email_password)
                elif "encrypted_password" not in trigger_config:
                    # Keep the existing encrypted password from DB
                    existing = dict(schedule.trigger_config or {})
                    if "encrypted_password" in existing:
                        trigger_config["encrypted_password"] = existing["encrypted_password"]
            schedule.trigger_config = trigger_config
        if data.is_active is not None:
            schedule.is_active = data.is_active

        if data.task_ids is not None:
            if data.task_ids:
                tasks = await self.task_repo.get_by_ids(data.task_ids)
                if len(tasks) != len(data.task_ids):
                    raise ValidationError("One or more task IDs not found")
            await self.repo.replace_tasks(schedule_id, data.task_ids)

        await self.db.commit()
        return await self.repo.get_with_tasks(schedule_id)

    async def delete_schedule(self, schedule_id: UUID) -> None:
        from sqlalchemy import update, delete
        from app.models.task_run import TaskRun
        from app.models.schedule import schedule_tasks

        # 1. Null out FK on task_runs (preserves run history, just unlinks schedule)
        await self.db.execute(
            update(TaskRun)
            .where(TaskRun.schedule_id == schedule_id)
            .values(schedule_id=None)
        )

        # 2. Remove schedule_tasks join rows
        await self.db.execute(
            delete(schedule_tasks).where(schedule_tasks.c.schedule_id == schedule_id)
        )

        await self.db.flush()

        deleted = await self.repo.delete(schedule_id)
        if not deleted:
            raise NotFoundError(f"Schedule {schedule_id} not found")

    async def toggle_schedule(self, schedule_id: UUID) -> Schedule:
        schedule = await self.repo.get_with_tasks(schedule_id)
        if not schedule:
            raise NotFoundError(f"Schedule {schedule_id} not found")
        schedule.is_active = not schedule.is_active
        await self.db.commit()
        return schedule
