from sqlalchemy import String, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.mixins import UUIDMixin, TimestampMixin


class Domain(Base, UUIDMixin, TimestampMixin):
    """
    Domain model for grouping related agents.
    Domains are automatically created and assigned via LLM classification.
    """
    __tablename__ = "domains"

    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text)
    agent_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationship to agents
    agents: Mapped[list["Agent"]] = relationship(
        "Agent",
        back_populates="domain",
        lazy="selectin"
    )

    def __repr__(self):
        return f"<Domain(id={self.id}, name={self.name}, agent_count={self.agent_count})>"
