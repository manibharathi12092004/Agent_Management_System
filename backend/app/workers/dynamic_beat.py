"""
Dynamic Celery Beat Scheduler — pure in-memory, no shelve files.

Uses base Scheduler (not PersistentScheduler) to avoid all shelve/merge_inplace issues.
Polls PostgreSQL every 30 seconds for cron schedule changes.
Email poll runs every 60 seconds as a fixed task.

Usage:
  celery -A app.workers.celery_app beat \
    --scheduler app.workers.dynamic_beat.DatabaseScheduler \
    --loglevel=info
"""

import asyncio
import logging
import threading
import time
from datetime import datetime, timezone, timedelta

from celery.beat import Scheduler, ScheduleEntry
from celery.schedules import crontab, schedule as periodic_schedule

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


def _make_entry(name: str, task: str, sched, args: list, app) -> ScheduleEntry:
    """Create a ScheduleEntry with last_run_at set to 2 minutes ago so it fires immediately."""
    return ScheduleEntry(
        name=name,
        task=task,
        schedule=sched,
        args=args,
        kwargs={},
        options={},
        last_run_at=datetime.now(timezone.utc) - timedelta(minutes=2),
        total_run_count=0,
        relative=False,
        app=app,
    )


# ── Pure in-memory scheduler ──────────────────────────────────────────

class DatabaseScheduler(Scheduler):
    """
    Pure in-memory Beat scheduler.
    - No shelve files
    - No merge_inplace
    - Polls DB every 30s via background thread
    - email-poll fires every 60s as a fixed entry
    """

    max_interval = 5  # check for due tasks every 5 seconds

    def __init__(self, *args, **kwargs):
        # _store is our in-memory dict — replaces shelve
        self._store: dict[str, ScheduleEntry] = {}
        self._lock = threading.Lock()
        super().__init__(*args, **kwargs)

    def setup_schedule(self):
        """Called once at startup — register fixed tasks and start DB poller."""
        self.install_default_entries(self._store)

        # Fixed: email poll every 60 seconds
        self._store["email-poll"] = _make_entry(
            name="email-poll",
            task="app.workers.tasks.poll_email_triggers",
            sched=periodic_schedule(60.0),
            args=[],
            app=self.app,
        )
        logger.info("[Beat] + email-poll (every 60s)")

        # Initial cron load
        self._sync_cron()

        # Background thread for DB polling
        self._stop_event = threading.Event()
        t = threading.Thread(target=self._poll_loop, daemon=True, name="beat-db-poller")
        t.start()
        logger.info(f"[Beat] DB poller started (interval={SYNC_INTERVAL}s)")

    def _poll_loop(self):
        while not self._stop_event.is_set():
            self._stop_event.wait(SYNC_INTERVAL)
            if not self._stop_event.is_set():
                self._sync_cron()

    def _sync_cron(self):
        """Fetch active cron schedules and update in-memory store."""
        schedules, success = _fetch_active_cron_schedules()
        if not success:
            logger.warning("[Beat] DB poll failed — keeping existing entries")
            return

        active_keys = {f"schedule:{s['id']}" for s in schedules}

        with self._lock:
            # Remove deactivated
            removed = 0
            for key in [k for k in list(self._store.keys()) if k.startswith("schedule:")]:
                if key not in active_keys:
                    del self._store[key]
                    removed += 1
                    logger.info(f"[Beat] - Removed '{key}'")

            # Add new
            added = 0
            for sched in schedules:
                key = f"schedule:{sched['id']}"
                if key not in self._store:
                    try:
                        self._store[key] = _make_entry(
                            name=key,
                            task="app.workers.tasks.execute_scheduled_tasks",
                            sched=_parse_crontab(sched["cron_expression"]),
                            args=[sched["id"]],
                            app=self.app,
                        )
                        added += 1
                        logger.info(f"[Beat] + '{sched['name']}' [{sched['cron_expression']}]")
                    except Exception as e:
                        logger.error(f"[Beat] Failed to add '{sched['name']}': {e}")

        if removed or added:
            logger.info(f"[Beat] Sync — {len(schedules)} active, {removed} removed, {added} added")

    # ── Required overrides ────────────────────────────────────────────

    @property
    def schedule(self):
        return self._store

    def get_schedule(self):
        return self._store

    def set_schedule(self, schedule):
        self._store = schedule

    def sync(self):
        pass  # nothing to persist — pure in-memory

    def close(self):
        if hasattr(self, '_stop_event'):
            self._stop_event.set()
        self.sync()
