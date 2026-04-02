"""
Folder Watch & File Watch trigger handler.

folder_watch: triggers when ANY file is created or modified in a directory.
file_watch:   triggers when a file matching specific extension(s) is created or modified.

Uses watchdog for cross-platform file system monitoring.
"""
import logging
import os
from fnmatch import fnmatch
from pathlib import Path

from watchdog.events import FileSystemEventHandler

logger = logging.getLogger(__name__)


class WatchHandler(FileSystemEventHandler):
    """
    Handles file system events for both folder_watch and file_watch triggers.

    folder_watch: fires on any file created/modified
    file_watch:   fires only when file extension matches trigger_config.file_types
    """

    def __init__(self, schedule_id: str, trigger_type: str, trigger_config: dict):
        super().__init__()
        self.schedule_id = schedule_id
        self.trigger_type = trigger_type
        self.trigger_config = trigger_config

        # file_watch: list of extensions e.g. [".csv", ".txt", ".pdf"]
        raw_types = trigger_config.get("file_types", [])
        self.file_types = [
            ext if ext.startswith(".") else f".{ext}"
            for ext in raw_types
        ]

        # Debounce: track recently triggered files to avoid double-firing
        self._recent: set[str] = set()

    def _should_trigger(self, path: str) -> bool:
        if self.trigger_type == "folder_watch":
            return True  # any file
        # file_watch: check extension
        if not self.file_types:
            return True  # no filter = all files
        ext = Path(path).suffix.lower()
        return ext in self.file_types

    def _dispatch(self, path: str) -> None:
        if path in self._recent:
            return
        self._recent.add(path)

        # Convert absolute path → relative to uploads/agent_fs base dir
        # so agents can use file_system(action='read', path=relative_path) directly
        try:
            from app.tools.file_system import BASE_DIR
            rel_path = str(Path(path).resolve().relative_to(BASE_DIR))
        except ValueError:
            # File is outside BASE_DIR — pass as-is, agent will handle it
            rel_path = path

        logger.info(
            f"[Watcher] {self.trigger_type} triggered | "
            f"schedule={self.schedule_id} file={os.path.basename(path)} rel={rel_path}"
        )

        from app.workers.tasks import execute_scheduled_tasks
        execute_scheduled_tasks.delay(
            self.schedule_id,
            input_data={
                "triggered_file": rel_path,       # relative path — use with file_system tool
                "triggered_file_abs": path,        # absolute path — for reference
                "trigger_type": self.trigger_type,
            },
        )

        # Clear debounce after a short delay (run in background thread)
        import threading
        def _clear():
            import time
            time.sleep(5)
            self._recent.discard(path)
        threading.Thread(target=_clear, daemon=True).start()

    def on_created(self, event):
        if not event.is_directory and self._should_trigger(event.src_path):
            self._dispatch(event.src_path)

    def on_modified(self, event):
        if not event.is_directory and self._should_trigger(event.src_path):
            self._dispatch(event.src_path)
