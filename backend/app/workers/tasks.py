"""
Celery task definitions for async workflow execution.
"""

import asyncio
import logging
from datetime import datetime, timezone
from uuid import UUID
from sqlalchemy.pool import NullPool

import app.models.llm_config   # noqa
import app.models.tool         # noqa
import app.models.agent        # noqa
import app.models.task         # noqa
import app.models.schedule     # noqa
import app.models.task_run     # noqa
import app.models.domain       # noqa

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")


def _run_async(coro):
    """Run a coroutine in a fresh event loop with a fresh DB engine (NullPool).
    
    Using NullPool prevents asyncpg connections from being reused across
    different event loops, which causes 'Future attached to a different loop' errors
    when multiple Celery tasks run sequentially in the same process.
    """
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from sqlalchemy.pool import NullPool
    from app.config import settings
    import app.db.session as db_session

    # Create a fresh engine with NullPool for this task's event loop
    fresh_engine = create_async_engine(
        settings.DATABASE_URL,
        poolclass=NullPool,
        echo=False,
    )
    fresh_session = async_sessionmaker(
        bind=fresh_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    # Temporarily replace the global session factory
    original_session = db_session.AsyncSessionLocal
    original_engine = db_session.engine
    db_session.AsyncSessionLocal = fresh_session
    db_session.engine = fresh_engine

    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        # Dispose the fresh engine and restore originals
        try:
            loop.run_until_complete(fresh_engine.dispose())
        except Exception:
            pass
        try:
            loop.close()
        except Exception:
            pass
        db_session.AsyncSessionLocal = original_session
        db_session.engine = original_engine


# =====================================================================
# EXECUTE TASK WORKFLOW
# =====================================================================

@celery_app.task(bind=True, max_retries=3, name="app.workers.tasks.execute_task_workflow")
def execute_task_workflow(self, task_run_id: str, task_id: str):
    """Execute a multi-agent workflow."""

    log_lines: list[str] = []

    def log(msg: str) -> None:
        line = f"[{_now_iso()}] {msg}"
        log_lines.append(line)
        logger.info(line)

    log(f"Starting workflow | task_run_id={task_run_id} task_id={task_id}")

    async def _run_all():
        from app.db.session import AsyncSessionLocal
        from app.repositories.task import TaskRepository
        from app.repositories.llm_config import LLMConfigRepository
        from app.models.task_run import TaskRun
        from app.workers.execution_engine import run_workflow
        from sqlalchemy import select

        started_at = datetime.now(timezone.utc)

        async with AsyncSessionLocal() as db:
            # ── Mark as running ──────────────────────────────────────
            result = await db.execute(select(TaskRun).where(TaskRun.id == UUID(task_run_id)))
            run = result.scalar_one_or_none()
            if not run:
                raise ValueError(f"TaskRun {task_run_id} not found")
            run.status = "running"
            run.started_at = started_at
            await db.commit()

            # ── Load task ────────────────────────────────────────────
            task_repo = TaskRepository(db)
            task = await task_repo.get_with_steps(UUID(task_id))
            if not task:
                raise ValueError(f"Task {task_id} not found")

            llm_repo = LLMConfigRepository(db)
            default_llm = await llm_repo.get_default()
            if not default_llm:
                raise ValueError("No default LLM configuration found")

            sorted_steps = sorted(task.steps, key=lambda s: s.step_order)
            effective_input = {
                "task": task.name,
                "description": task.description or task.name,
            }

            # ── Execute ──────────────────────────────────────────────
            results = await run_workflow(sorted_steps, default_llm, effective_input)

            total_steps   = len(results)
            success_count = sum(1 for r in results if not r.get("error") and not r.get("skipped"))
            failed_count  = sum(1 for r in results if r.get("error"))
            skipped_count = sum(1 for r in results if r.get("skipped"))

            log("─" * 60)
            log(f"WORKFLOW: {task.name}")
            log(f"STEPS: {total_steps} total  |  {success_count} succeeded  |  {failed_count} failed  |  {skipped_count} skipped")
            log("─" * 60)

            for r in results:
                if r.get("skipped"):
                    log(f"[SKIP]  Step {r['step_order']} — {r['agent_name']}")
                elif r.get("error"):
                    log(f"[FAIL]  Step {r['step_order']} — {r['agent_name']}  ({r['duration_ms']}ms)")
                    log(f"        Error: {r['error']}")
                else:
                    log(f"[OK]    Step {r['step_order']} — {r['agent_name']}  ({r['duration_ms']}ms)")
                    preview = (r.get("output") or "").replace("\n", " ").strip()[:300]
                    if preview:
                        log(f"        Output: {preview}{'...' if len(r.get('output', '')) > 300 else ''}")

            log("─" * 60)
            if failed_count == 0:
                log("[SUCCESS] Workflow completed successfully")
            else:
                log(f"[PARTIAL] Workflow finished with {failed_count} failed step(s)")

            # ── Mark completed ───────────────────────────────────────
            completed_at = datetime.now(timezone.utc)
            run.status = "completed"
            run.completed_at = completed_at
            run.duration_seconds = (completed_at - started_at).total_seconds()
            run.log_output = "\n".join(log_lines)
            await db.commit()

    try:
        _run_async(_run_all())
    except Exception as exc:
        err_str = str(exc)
        # Ignore asyncio cleanup noise — task actually completed
        if "event loop is closed" in err_str.lower():
            logger.warning(f"Suppressed post-run cleanup error: {err_str}")
            return

        log(f"ERROR: {err_str}")

        async def _mark_failed():
            from app.db.session import AsyncSessionLocal
            from app.models.task_run import TaskRun
            from sqlalchemy import select
            async with AsyncSessionLocal() as db:
                result = await db.execute(select(TaskRun).where(TaskRun.id == UUID(task_run_id)))
                run = result.scalar_one_or_none()
                if run:
                    completed_at = datetime.now(timezone.utc)
                    run.status = "failed"
                    run.completed_at = completed_at
                    if run.started_at:
                        run.duration_seconds = (completed_at - run.started_at).total_seconds()
                    run.log_output = "\n".join(log_lines)
                    run.error_message = err_str
                    await db.commit()

        try:
            _run_async(_mark_failed())
        except Exception as inner:
            logger.error(f"Failed to mark run as failed: {inner}")

        raise self.retry(exc=exc, countdown=60)


# =====================================================================
# EXECUTE SCHEDULED TASKS (triggered by Celery Beat)
# =====================================================================

@celery_app.task(bind=True, name="app.workers.tasks.execute_scheduled_tasks")
def execute_scheduled_tasks(self, schedule_id: str):
    """Triggered by Beat. Creates TaskRun per task and dispatches each."""

    log_lines: list[str] = []

    def log(msg: str) -> None:
        line = f"[{_now_iso()}] {msg}"
        log_lines.append(line)
        logger.info(line)

    log(f"Schedule triggered | schedule_id={schedule_id}")

    async def _dispatch():
        from app.db.session import AsyncSessionLocal
        from app.repositories.schedule import ScheduleRepository
        from app.models.task_run import TaskRun

        async with AsyncSessionLocal() as db:
            repo = ScheduleRepository(db)
            schedule = await repo.get_with_tasks(UUID(schedule_id))

            if not schedule:
                log(f"Schedule {schedule_id} not found — skipping")
                return

            if not schedule.is_active:
                log(f"Schedule '{schedule.name}' is inactive — skipping")
                return

            log(f"Running schedule '{schedule.name}' with {len(schedule.tasks)} task(s)")

            for task in schedule.tasks:
                run = TaskRun(
                    schedule_id=schedule.id,
                    task_id=task.id,
                    status="pending",
                )
                db.add(run)
                await db.flush()

                celery_result = execute_task_workflow.delay(
                    task_run_id=str(run.id),
                    task_id=str(task.id),
                )
                run.celery_task_id = celery_result.id
                log(f"  Dispatched task '{task.name}' → celery_id={celery_result.id}")

            await db.commit()

    _run_async(_dispatch())
    log("Schedule dispatch complete")
