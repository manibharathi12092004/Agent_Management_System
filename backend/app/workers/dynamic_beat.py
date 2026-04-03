"""
Dynamic Celery Beat Scheduler — polls PostgreSQL every 30 seconds.

Extends PersistentScheduler. Uses a background thread to poll the DB
so the main Beat tick loop is never blocked or broken.

Usage:
  celery -A app.workers.celery_app beat \
    --scheduler app.workers.dynamic_beat.DatabaseScheduler \
    --loglevel=info
"""

import asyncio
import logging
import threading
import time

from celery.beat import PersistentScheduler
from celery.schedules import crontab

logger = logging.getLogger(__name__)

SYNC_INTERVAL = 30  # seconds between DB polls


# ── DB fetch ──────────────────────────────────────────────────────────

def _fetch_active_cron_schedules() -> tuple[list[dict], bool]:
    async def _query():
        import app.models.llm_config  # noqa
        import app.models.tool        # noqa
        import app.models.agent       # noqa
        import app.models.task        # noqa
        import app.models.schedule    # noqa
        import app.models.task_run    # noqa
        import app.models.domain      # noqa

        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
        from sqlalchemy.pool import NullPool
        from app.config import settings
        from app.repositories.schedule import ScheduleRepository

        engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool, echo=False)
        session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
        try:
            async with session_factory() as db:
                repo = ScheduleRepository(db)
                schedules = await repo.list_active_cron()
                return [
                    {"id": str(s.id), "name": s.name, "cron_expression": s.cron_expression}
                    for s in schedules if s.cron_expression
                ]
        finally:
            await engine.dispose()

    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(_query()), True
    except Exception as e:
        logger.error(f"[Beat] DB fetch failed: {e}")
        return [], False
    finally:
        loop.close()


def _parse_crontab(expr: str) -> crontab:
    parts = expr.strip().split()
    if len(parts) != 5:
        raise ValueError(f"Invalid cron: {expr!r}")
    minute, hour, dom, month, dow = parts
    return crontab(minute=minute, hour=hour,
                   day_of_month=dom, month_of_year=month, day_of_week=dow)


# ── Scheduler ─────────────────────────────────────────────────────────

class DatabaseScheduler(PersistentScheduler):
    """
    Polls PostgreSQL every SYNC_INTERVAL seconds via a background thread.
    The background thread is the ONLY place DB polling happens — Beat's
    tick loop is never touched, so no signature/heapq issues.
    """

    max_interval = 5  # Beat wakes up every 5s to check due tasks

    def __init__(self, *args, **kwargs):
        self._registered_keys: set[str] = set()  # track keys we've already registered
        super().__init__(*args, **kwargs)

    def setup_schedule(self):
        # Auto-recover corrupted shelve
        try:
            super().setup_schedule()
        except Exception as e:
            logger.warning(f"[Beat] Shelve corrupted ({e}), rebuilding...")
            self._destroy_shelve()
            super().setup_schedule()

        # Add email poller as a fixed periodic task (every 60s)
        # Must be done AFTER super().setup_schedule() so merge_inplace works
        self.app.conf.beat_schedule["email-poll"] = {
            "task": "app.workers.tasks.poll_email_triggers",
            "schedule": 60.0,
            "args": [],
        }
        self.merge_inplace({"email-poll": self.app.conf.beat_schedule["email-poll"]})
        self.sync()

        # Initial load of cron schedules
        self._apply_db_schedules()

        # Start background polling thread
        self._stop_event = threading.Event()
        self._poll_thread = threading.Thread(
            target=self._poll_loop,
            daemon=True,
            name="beat-db-poller",
        )
        self._poll_thread.start()
        logger.info(f"[Beat] DB poller started (interval={SYNC_INTERVAL}s)")

    def _poll_loop(self):
        """Background thread: polls DB every SYNC_INTERVAL seconds."""
        while not self._stop_event.is_set():
            self._stop_event.wait(SYNC_INTERVAL)
            if not self._stop_event.is_set():
                self._apply_db_schedules()

    def _apply_db_schedules(self):
        """Fetch DB schedules and update beat_schedule + persistent store."""
        schedules, success = _fetch_active_cron_schedules()

        if not success:
            logger.warning("[Beat] DB poll failed — keeping existing entries")
            return

        active_keys = {f"schedule:{s['id']}" for s in schedules}

        # Remove deactivated cron entries (never touch email-poll)
        removed = 0
        for key in [k for k in list(self.data.keys()) if k.startswith("schedule:")]:
            if key not in active_keys:
                del self.data[key]
                self.app.conf.beat_schedule.pop(key, None)
                self._registered_keys.discard(key)
                removed += 1
                logger.info(f"[Beat] - Removed '{key}'")

        # Add new cron entries — only call merge_inplace ONCE per key
        added = 0
        for sched in schedules:
            key = f"schedule:{sched['id']}"
            if key not in self._registered_keys:
                try:
                    entry_def = {
                        "task": "app.workers.tasks.execute_scheduled_tasks",
                        "schedule": _parse_crontab(sched["cron_expression"]),
                        "args": [sched["id"]],
                    }
                    self.app.conf.beat_schedule[key] = entry_def
                    self.merge_inplace({key: entry_def})
                    # Set last_run_at to 2 minutes ago so it fires on the next due time
                    if key in self.data:
                        from datetime import datetime, timezone, timedelta
                        self.data[key].last_run_at = datetime.now(timezone.utc) - timedelta(minutes=2)
                    self._registered_keys.add(key)
                    added += 1
                    logger.info(f"[Beat] + '{sched['name']}' [{sched['cron_expression']}]")
                except Exception as e:
                    logger.error(f"[Beat] Failed to add '{sched['name']}': {e}")

        # Ensure email-poll stays — only register once
        if "email-poll" not in self._registered_keys:
            email_poll_def = {
                "task": "app.workers.tasks.poll_email_triggers",
                "schedule": 60.0,
                "args": [],
            }
            self.app.conf.beat_schedule["email-poll"] = email_poll_def
            self.merge_inplace({"email-poll": email_poll_def})
            self._registered_keys.add("email-poll")
            logger.info("[Beat] + email-poll task registered")

        if removed or added:
            self.sync()
            logger.info(f"[Beat] Sync — {len(schedules)} active, {removed} removed, {added} added")
        else:
            logger.debug(f"[Beat] Sync — {len(schedules)} active, no changes")

    def _destroy_shelve(self):
        import os, glob
        for f in glob.glob(self.schedule_filename + "*"):
            try:
                os.remove(f)
                logger.info(f"[Beat] Removed corrupted file: {f}")
            except Exception:
                pass

    def close(self):
        if hasattr(self, '_stop_event'):
            self._stop_event.set()
        super().close()
