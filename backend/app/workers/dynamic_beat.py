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


def _fetch_active_cron_schedules() -> list[dict]:
    """Fetch active cron schedules from DB synchronously."""
    async def _query():
        import app.models.llm_config   # noqa
        import app.models.tool         # noqa
        import app.models.agent        # noqa
        import app.models.task         # noqa
        import app.models.schedule     # noqa
        import app.models.task_run     # noqa
        import app.models.domain       # noqa

        from app.db.session import AsyncSessionLocal
        from app.repositories.schedule import ScheduleRepository

        async with AsyncSessionLocal() as db:
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

    try:
        return asyncio.run(_query())
    except Exception as e:
        logger.error(f"Failed to load schedules from DB: {e}")
        return []


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
        # Populate beat_schedule BEFORE parent initializes _store
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
        schedules = _fetch_active_cron_schedules()
        if not schedules:
            logger.info("DatabaseScheduler: No active cron schedules found in DB")
            return
        for sched in schedules:
            self._register_entry(sched)
        logger.info(f"DatabaseScheduler: Loaded {len(schedules)} schedule(s) at startup")

    def _resync(self):
        """
        Re-query DB and reconcile:
        - Remove entries for inactive/deleted schedules
        - Add any newly activated schedules
        Called during tick() so _store is guaranteed to be initialized.
        """
        try:
            db_schedules = _fetch_active_cron_schedules()
        except Exception as e:
            logger.error(f"DatabaseScheduler: Re-sync failed: {e}")
            return

        active_keys = {"schedule:" + s["id"] for s in db_schedules}

        # Find stale entries (were in beat_schedule but no longer active)
        stale_keys = [
            k for k in list(self.app.conf.beat_schedule)
            if k.startswith("schedule:") and k not in active_keys
        ]

        for key in stale_keys:
            # Remove from conf
            self.app.conf.beat_schedule.pop(key, None)
            # Remove from the persistent store entries directly
            try:
                entries = self._store.get("entries", {})
                if key in entries:
                    del entries[key]
                    self._store["entries"] = entries
            except Exception:
                pass
            logger.info(f"DatabaseScheduler: Removed stale entry '{key}'")

        # Add/update active schedules
        added = 0
        for sched in db_schedules:
            key = "schedule:" + sched["id"]
            if key not in self.app.conf.beat_schedule:
                self._register_entry(sched)
                added += 1

        if stale_keys or added:
            # Rebuild in-memory schedule from updated beat_schedule
            self.merge_inplace(self.app.conf.beat_schedule)
            self.sync()
            logger.info(
                f"DatabaseScheduler: Re-sync complete — "
                f"{len(db_schedules)} active, {len(stale_keys)} removed, {added} added"
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
