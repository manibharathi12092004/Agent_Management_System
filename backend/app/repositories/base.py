from __future__ import annotations

from typing import Generic, TypeVar, Type, Sequence
from uuid import UUID

from sqlalchemy import select, delete as sa_delete, func
from sqlalchemy.ext.asyncio import AsyncSession


ModelType = TypeVar("ModelType")


class BaseRepository(Generic[ModelType]):
    """
    Generic async repository providing common CRUD operations.

    Designed for SQLAlchemy 2.0 async ORM.

    Each module-specific repository should inherit from this class.
    """

    def __init__(self, model: Type[ModelType], db: AsyncSession):
        self.model = model
        self.db = db

    # ------------------------------------------------------------------
    # READ OPERATIONS
    # ------------------------------------------------------------------

    async def get(self, id: UUID) -> ModelType | None:
        """Get a single record by primary key."""
        result = await self.db.execute(
            select(self.model).where(self.model.id == id)
        )
        return result.scalar_one_or_none()

    async def list(
        self,
        skip: int = 0,
        limit: int = 100
    ) -> list[ModelType]:
        """
        List records with pagination.

        Default limit protects against accidental full-table scans.
        """
        result = await self.db.execute(
            select(self.model)
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def count(self) -> int:
        """Return total number of records."""
        result = await self.db.execute(
            select(func.count()).select_from(self.model)
        )
        return result.scalar_one()

    async def exists(self, id: UUID) -> bool:
        """Check whether a record exists."""
        result = await self.db.execute(
            select(func.count())
            .select_from(self.model)
            .where(self.model.id == id)
        )
        return result.scalar_one() > 0

    # ------------------------------------------------------------------
    # CREATE
    # ------------------------------------------------------------------

    async def create(self, obj: ModelType) -> ModelType:
        """
        Persist a new ORM object.

        Caller is responsible for constructing the model instance.
        """
        self.db.add(obj)
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    # ------------------------------------------------------------------
    # UPDATE (generic merge)
    # ------------------------------------------------------------------

    async def update(self, obj: ModelType) -> ModelType:
        """
        Persist changes to an existing object.

        Assumes obj is already attached to session.
        """
        await self.db.commit()
        await self.db.refresh(obj)
        return obj

    # ------------------------------------------------------------------
    # DELETE
    # ------------------------------------------------------------------

    async def delete(self, id: UUID) -> bool:
        """
        Delete a record by ID.

        Returns True if deleted, False if not found.
        """
        stmt = sa_delete(self.model).where(self.model.id == id)
        result = await self.db.execute(stmt)

        if result.rowcount == 0:
            return False

        await self.db.commit()
        return True