
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.tool import ToolRepository
from app.repositories.agent import AgentRepository
from app.core.exceptions import NotFoundError, ValidationError


class ToolService:

    def __init__(self, db: AsyncSession):
        self.db = db
        self.tool_repo = ToolRepository(db)
        self.agent_repo = AgentRepository(db)

    # -----------------------------------------------------
    # LIST TOOLS
    # -----------------------------------------------------

    async def list_tools(self, active_only: bool = True):
        if active_only:
            return await self.tool_repo.list_active()
        return await self.tool_repo.list()

    # -----------------------------------------------------
    # GET TOOL
    # -----------------------------------------------------

    async def get_tool(self, tool_id: UUID):
        tool = await self.tool_repo.get(tool_id)
        if not tool:
            raise NotFoundError(f"Tool {tool_id} not found")
        return tool

    # -----------------------------------------------------
    # ASSIGN TOOL TO AGENTS
    # -----------------------------------------------------

    async def assign_tool_to_agents(
        self,
        tool_id: UUID,
        agent_ids: list[UUID]
    ) -> list[UUID]:

        tool = await self.tool_repo.get(tool_id)
        if not tool:
            raise NotFoundError(f"Tool {tool_id} not found")

        if not tool.is_active:
            raise ValidationError("Cannot assign inactive tool")

        agents = await self.agent_repo.get_by_ids(agent_ids)

        if len(agents) != len(agent_ids):
            raise ValidationError("One or more agents not found")

        # Attach tool to each agent (many-to-many)
        for agent in agents:
            if tool not in agent.tools:
                agent.tools.append(tool)

        await self.db.commit()

        return [agent.id for agent in agents]

    # -----------------------------------------------------
    # UNASSIGN TOOL FROM AGENTS
    # -----------------------------------------------------

    async def unassign_tool_from_agents(
        self,
        tool_id: UUID,
        agent_ids: list[UUID]
    ) -> list[UUID]:

        tool = await self.tool_repo.get(tool_id)
        if not tool:
            raise NotFoundError(f"Tool {tool_id} not found")

        agents = await self.agent_repo.get_by_ids(agent_ids)

        for agent in agents:
            if tool in agent.tools:
                agent.tools.remove(tool)

        await self.db.commit()

        return [agent.id for agent in agents]
