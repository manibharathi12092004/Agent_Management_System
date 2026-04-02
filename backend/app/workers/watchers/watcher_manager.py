"""
WatcherManager — starts/stops watchdog Observers per schedule.

Lifecycle:
  - Called on Celery worker startup via worker_ready signal
  - Polls DB every 60s to pick up newly activated/deactivated schedules
  - One Observer per active folder_watch / file_watch schedule
"""
import asyncio
import logging
import os
import threading
import time

from watchdog.observers import Observer

logger = logging.getLogger(__name__)

WATCH_TRIGGER_TYPES = {"folder_watch", "file_watch"}
SYNC_INTERVAL = 60  # seconds


def _fetch_active_watch_schedules() -> tuple[list[dict], bool]:
    """Fetch active folder_watch and file_watch schedules from DB."""
    async def _query():
        import app.models.schedule  # noqa
        from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
        from sqlalchemy.pool import NullPool
        from app.config import settings
        from app.repositories.schedule import ScheduleRepository

        engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool, echo=False)
        session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
        try:
            async with session_factory() as db:
                repo = ScheduleRepository(db)
                schedules = await repo.list_active_watch()
                return [
                    {
                        "id": str(s.id),
                        "name": s.name,
                        "trigger_type": s.trigger_type,
                        "trigger_config": s.trigger_config or {},
                    }
                    for s in schedules
                ]
        finally:
            await engine.dispose()

    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(_query()), True
    except Exception as e:
        logger.error(f"[WatcherManager] DB fetch failed: {e}")
        return [], False
    finally:
        loop.close()


class WatcherManager:
    """Manages one watchdog Observer per active watch schedule."""

    def __init__(self):
        self._observers: dict[str, Observer] = {}
        self._lock = threading.Lock()

    def start(self):
        """Initial sync + start background polling thread."""
        self._sync()
        t = threading.Thread(target=self._poll_loop, daemon=True, name="watcher-manager")
        t.start()
        logger.info("[WatcherManager] Started")

    def _poll_loop(self):
        while True:
            time.sleep(SYNC_INTERVAL)
            self._sync()

    def _sync(self):
        schedules, success = _fetch_active_watch_schedules()
        if not success:
            return

        active_ids = {s["id"] for s in schedules}

        with self._lock:
            # Stop removed/deactivated watchers
            for sid in list(self._observers):
                if sid not in active_ids:
                    self._stop_observer(sid)

            # Start new watchers
            for sched in schedules:
                sid = sched["id"]
                if sid not in self._observers:
                    self._start_observer(sched)

    def _start_observer(self, sched: dict):
        from app.workers.watchers.folder_watcher import WatchHandler
        from app.tools.file_system import BASE_DIR

        cfg = sched["trigger_config"]
        folder = cfg.get("folder_path", "").strip()

        if not folder:
            logger.warning(f"[WatcherManager] Schedule '{sched['name']}' has no folder_path — skipping")
            return

        # Resolve absolute path
        if not os.path.isabs(folder):
            backend_root = os.path.dirname(
                os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            )
            folder = os.path.normpath(os.path.join(backend_root, folder))

        # Security: folder must be inside BASE_DIR (uploads/agent_fs)
        try:
            from pathlib import Path
            resolved = Path(folder).resolve()
            if not str(resolved).startswith(str(BASE_DIR)):
                logger.error(
                    f"[WatcherManager] BLOCKED: Schedule '{sched['name']}' watch path "
                    f"'{folder}' is outside allowed directory '{BASE_DIR}'"
                )
                return
        except Exception as e:
            logger.error(f"[WatcherManager] Path validation failed for '{sched['name']}': {e}")
            return

        os.makedirs(folder, exist_ok=True)

        recursive = cfg.get("recursive", False)
        handler = WatchHandler(
            schedule_id=sched["id"],
            trigger_type=sched["trigger_type"],
            trigger_config=cfg,
        )

        observer = Observer()
        observer.schedule(handler, path=folder, recursive=recursive)
        observer.start()
        self._observers[sched["id"]] = observer

        logger.info(
            f"[WatcherManager] + '{sched['name']}' "
            f"({sched['trigger_type']}) watching: {folder}"
        )

    def _stop_observer(self, schedule_id: str):
        observer = self._observers.pop(schedule_id, None)
        if observer:
            try:
                observer.stop()
                observer.join(timeout=3)
            except Exception:
                pass
            logger.info(f"[WatcherManager] - Stopped watcher for schedule {schedule_id}")

    def stop_all(self):
        with self._lock:
            for sid in list(self._observers):
                self._stop_observer(sid)


# Singleton
_manager: WatcherManager | None = None


def get_manager() -> WatcherManager:
    global _manager
    if _manager is None:
        _manager = WatcherManager()
    return _manager
