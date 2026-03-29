from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.domain import Domain
from app.models.agent import Agent
from app.repositories.base import BaseRepository


class DomainRepository(BaseRepository[Domain]):
    """Repository for Domain model"""

    def __init__(self, db: AsyncSession):
        super().__init__(Domain, db)

    async def get_by_name(self, name: str) -> Domain | None:
        """Get domain by name"""
        stmt = select(Domain).where(Domain.name == name)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all_with_counts(self) -> list[Domain]:
        """Get all domains with accurate agent counts"""
        stmt = select(Domain)
        result = await self.db.execute(stmt)
        domains = result.scalars().all()
        
        # Update agent counts
        for domain in domains:
            count_stmt = select(func.count(Agent.id)).where(Agent.domain_id == domain.id)
            count_result = await self.db.execute(count_stmt)
            domain.agent_count = count_result.scalar() or 0
        
        return list(domains)

    async def get_domain_agents(self, domain_id: UUID) -> list[Agent]:
        """Get all agents in a specific domain"""
        stmt = select(Agent).where(Agent.domain_id == domain_id)
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def update_agent_count(self, domain_id: UUID) -> None:
        """Update the agent count for a domain"""
        count_stmt = select(func.count(Agent.id)).where(Agent.domain_id == domain_id)
        result = await self.db.execute(count_stmt)
        count = result.scalar() or 0
        
        domain = await self.get(domain_id)
        if domain:
            domain.agent_count = count
            await self.db.commit()
