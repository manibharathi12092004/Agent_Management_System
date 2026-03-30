from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.dependencies import get_db
from app.models.agent import Agent
from app.models.llm_config import LLMConfig
from app.models.tool import Tool
from app.models.task import Task
from app.models.schedule import Schedule
from app.models.task_run import TaskRun

router = APIRouter()


@router.get("/stats")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
):
    """
    Get dashboard statistics.
    Returns counts for agents, tasks, schedules, and recent runs.
    """
    
    # Count agents
    agent_count_query = select(func.count(Agent.id))
    agent_count_result = await db.execute(agent_count_query)
    agent_count = agent_count_result.scalar() or 0
    
    # Count LLM configs (as a proxy for now)
    llm_count_query = select(func.count(LLMConfig.id))
    llm_count_result = await db.execute(llm_count_query)
    llm_count = llm_count_result.scalar() or 0
    
    # Count tools
    tool_count_query = select(func.count(Tool.id))
    tool_count_result = await db.execute(tool_count_query)
    tool_count = tool_count_result.scalar() or 0
    
    # Count tasks
    task_count_query = select(func.count(Task.id)).where(Task.is_active.is_(True))
    task_count_result = await db.execute(task_count_query)
    task_count = task_count_result.scalar() or 0

    # Count schedules
    schedule_count_query = select(func.count(Schedule.id))
    schedule_count_result = await db.execute(schedule_count_query)
    schedule_count = schedule_count_result.scalar() or 0

    # Recent runs (last 7, all trigger types combined)
    from sqlalchemy.orm import selectinload
    from sqlalchemy import desc
    runs_result = await db.execute(
        select(TaskRun)
        .options(selectinload(TaskRun.task), selectinload(TaskRun.schedule))
        .order_by(desc(TaskRun.created_at))
        .limit(7)
    )
    recent_runs = [
        {
            "id": str(r.id),
            "status": r.status.upper(),
            "started_at": r.started_at.isoformat() if r.started_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
            "duration_seconds": r.duration_seconds,
            "trigger_type": r.schedule.trigger_type if r.schedule else "manual",
            "task": {"name": r.task.name} if r.task else None,
            "schedule": {"name": r.schedule.name} if r.schedule else None,
        }
        for r in runs_result.scalars().all()
    ]

    return {
        "agent_count": agent_count,
        "task_count": task_count,
        "schedule_count": schedule_count,
        "llm_config_count": llm_count,
        "tool_count": tool_count,
        "recent_runs": recent_runs,
    }
