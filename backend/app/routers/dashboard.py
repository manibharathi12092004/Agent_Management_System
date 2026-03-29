from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.dependencies import get_db
from app.models.agent import Agent
from app.models.llm_config import LLMConfig
from app.models.tool import Tool
from app.models.task import Task

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

    return {
        "agent_count": agent_count,
        "task_count": task_count,
        "schedule_count": 0,
        "llm_config_count": llm_count,
        "tool_count": tool_count,
        "recent_runs": []
    }
