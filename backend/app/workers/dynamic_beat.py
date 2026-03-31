"""
Dynamic Celery Beat Scheduler — reads cron schedules from PostgreSQL.

Re-syncs every 60 seconds so activate/deactivate changes take effect
without restarting Beat.

Usage:
  celery -A app.workers.celery_app beat \
    --scheduler app.workers.dynamic_beat.DatabaseScheduler \
    --loglevel=info
"""

import asyncio
import logging
import time

from celery.beat import PersistentScheduler
from celery.schedules import crontab

logger = logging.getLogger(__name__)

SYNC_INTERVAL = 60  # seconds between DB re-syncs


def _fetch_active_cron_schedules() -> tuple[list[dict], bool]:
    """
    Fetch active cron schedules from DB synchronously.
    Returns (schedules, success) — success=False means DB fetch failed,
    so callers must NOT remove existing entries.
    """
    async def _query():
        import app.models.llm_config   # noqa
        import app.models.tool         # noqa
        import app.models.agent        # noqa
        import app.models.task         # noqa
        import app.models.schedule     # noqa
        import app.models.task_run     # noqa
        import app.models.domain       # noqa

        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
        from sqlalchemy.pool import NullPool
        from app.config import settings
        from app.repositories.schedule import ScheduleRepository

        # Use NullPool + fresh engine so Beat's event loop doesn't conflict
        # with connections created in worker task loops
        engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool, echo=False)
        session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

        try:
            async with session_factory() as db:
                repo = ScheduleRepository(db)
                schedules = await repo.list_active_cron()
                return [
                    {
                        "id": str(s.id),
                        "name": s.name,
                        "cron_expression": s.cron_expression,
                    }
                    for s in schedules
                    if s.cron_expression
                ]
        finally:
            await engine.dispose()

    # Always use a brand-new event loop to avoid conflicts with Beat's internal loop
    loop = asyncio.new_event_loop()
    try:
        result = loop.run_until_complete(_query())
        return result, True
    except Exception as e:
        logger.error(f"Failed to load schedules from DB: {e}")
        return [], False
    finally:
        try:
            loop.close()
        except Exception:
            pass


def _parse_crontab(expr: str) -> crontab:
    parts = expr.strip().split()
    if len(parts) != 5:
        raise ValueError(f"Invalid cron expression: {expr}")
    minute, hour, dom, month, dow = parts
    return crontab(minute=minute, hour=hour, day_of_month=dom,
                   month_of_year=month, day_of_week=dow)


class DatabaseScheduler(PersistentScheduler):
    """
    Celery Beat scheduler that loads cron schedules from PostgreSQL.
    Re-syncs every SYNC_INTERVAL seconds so toggle changes are picked up live.
    """

    def setup_schedule(self):
        self._load_db_into_beat_schedule()
        self._last_sync = time.monotonic()
        super().setup_schedule()

    def tick(self, *args, **kwargs):
        now = time.monotonic()
        if now - self._last_sync >= SYNC_INTERVAL:
            self._resync()
            self._last_sync = now
        return super().tick(*args, **kwargs)

    def _load_db_into_beat_schedule(self):
        """Initial load — called before _store exists."""
        schedules, success = _fetch_active_cron_schedules()
        if not success:
            logger.warning("DatabaseScheduler: Could not load schedules at startup — will retry on next sync")
            return
        if not schedules:
            logger.info("DatabaseScheduler: No active cron schedules found in DB")
            return
        for sched in schedules:
            self._register_entry(sched)
        logger.info(f"DatabaseScheduler: Loaded {len(schedules)} schedule(s) at startup")

    def _resync(self):
        """
        Re-query DB and reconcile beat_schedule.
        IMPORTANT: if DB fetch fails, do nothing — never remove entries on error.
        """
        db_schedules, success = _fetch_active_cron_schedules()

        if not success:
            # DB unreachable — keep existing entries, try again next cycle
            logger.warning("DatabaseScheduler: Re-sync skipped — DB fetch failed, keeping existing entries")
            return

        active_keys = {"schedule:" + s["id"] for s in db_schedules}

        # Only remove entries that are confirmed inactive (DB returned successfully)
        stale_keys = [
            k for k in list(self.app.conf.beat_schedule)
            if k.startswith("schedule:") and k not in active_keys
        ]

        for key in stale_keys:
            self.app.conf.beat_schedule.pop(key, None)
            try:
                entries = self._store.get("entries", {})
                if key in entries:
                    del entries[key]
                    self._store["entries"] = entries
            except Exception:
                pass
            logger.info(f"DatabaseScheduler: Removed inactive entry '{key}'")

        # Add newly activated schedules
        added = 0
        for sched in db_schedules:
            key = "schedule:" + sched["id"]
            if key not in self.app.conf.beat_schedule:
                self._register_entry(sched)
                added += 1

        if stale_keys or added:
            self.merge_inplace(self.app.conf.beat_schedule)
            self.sync()

        logger.info(
            f"DatabaseScheduler: Re-sync — {len(db_schedules)} active, "
            f"{len(stale_keys)} removed, {added} added"
        )

    def _register_entry(self, sched: dict):
        key = "schedule:" + sched["id"]
        try:
            self.app.conf.beat_schedule[key] = {
                "task": "app.workers.tasks.execute_scheduled_tasks",
                "schedule": _parse_crontab(sched["cron_expression"]),
                "args": [sched["id"]],
            }
            logger.info(f"  ✓ '{sched['name']}' [{sched['cron_expression']}]")
        except Exception as e:
            logger.error(f"  ✗ Failed to register '{sched['name']}': {e}")
