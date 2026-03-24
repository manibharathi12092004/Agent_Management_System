
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.tool import Tool
from app.repositories.base import BaseRepository


class ToolRepository(BaseRepository[Tool]):

    def __init__(self, db: AsyncSession):
        super().__init__(Tool, db)

    # -----------------------------------------------------
    # LIST ACTIVE TOOLS
    # -----------------------------------------------------

    async def list_active(self) -> list[Tool]:
        result = await self.db.execute(
            select(Tool).where(Tool.is_active == True)
        )
        return list(result.scalars().all())

    # -----------------------------------------------------
    # GET BY FUNCTION NAME
    # -----------------------------------------------------

    async def get_by_function_name(self, function_name: str) -> Tool | None:
        result = await self.db.execute(
            select(Tool).where(Tool.function_name == function_name)
        )
        return result.scalar_one_or_none()

    # -----------------------------------------------------
    # GET MULTIPLE BY IDS
    # -----------------------------------------------------

    async def get_by_ids(self, ids: list[UUID]) -> list[Tool]:
        result = await self.db.execute(
            select(Tool).where(Tool.id.in_(ids))
        )
        return list(result.scalars().all())