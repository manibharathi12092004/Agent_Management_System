"""
Celery application — configured for Upstash Redis (SSL/TLS).
"""

from celery import Celery
from celery.signals import worker_ready, worker_shutdown
from app.config import settings

celery_app = Celery(
    "ai_workflow",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    result_expires=86400,
)


@worker_ready.connect
def start_file_watchers(**kwargs):
    """Start folder/file watchers when Celery worker comes online."""
    try:
        from app.workers.watchers.watcher_manager import get_manager
        get_manager().start()
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to start file watchers: {e}")


@worker_shutdown.connect
def stop_file_watchers(**kwargs):
    """Stop all watchers cleanly on worker shutdown."""
    try:
        from app.workers.watchers.watcher_manager import get_manager
        get_manager().stop_all()
    except Exception:
        pass
