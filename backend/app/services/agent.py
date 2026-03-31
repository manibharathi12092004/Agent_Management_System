import os
import time  # ✅ ADDED
from uuid import UUID, uuid4
from typing import Optional, Dict, Any  

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.agent import Agent
from app.repositories.agent import AgentRepository
from app.repositories.llm_config import LLMConfigRepository
from app.repositories.tool import ToolRepository
from app.schemas.agent import (
    AgentCreate,
    AgentUpdate,
    DryRunRequest,   
    DryRunResponse,  
)
from app.core.exceptions import NotFoundError, ValidationError
from app.workers.execution_engine import run_single_agent  


class AgentService:
    """
    Business logic layer for Agent Management.
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AgentRepository(db)
        self.llm_repo = LLMConfigRepository(db)
        self.tool_repo = ToolRepository(db)

    # =========================================================
    # CREATE AGENT
    # =========================================================
    async def create_agent(
        self,
        data: AgentCreate,
        skill_file: Optional[UploadFile] = None,
    ) -> Agent:
        """
        Create a new agent with optional:
        - system prompt
        - skill file (.md)
        - tools
        - parent agent
        - LLM config
        """

        # -----------------------------------------------------
        # 1️⃣ Resolve LLM Configuration
        # -----------------------------------------------------
        llm_id = data.llm_config_id

        if llm_id is not None:
            llm = await self.llm_repo.get(llm_id)
            if not llm:
                raise NotFoundError("LLM configuration not found")
        else:
            default_llm = await self.llm_repo.get_default()
            llm_id = default_llm.id if default_llm else None

        # -----------------------------------------------------
        # 2️⃣ Validate Parent Agent
        # -----------------------------------------------------
        if data.parent_agent_id:
            parent = await self.repo.get(data.parent_agent_id)
            if not parent:
                raise NotFoundError("Parent agent not found")

        # -----------------------------------------------------
        # 3️⃣ Handle Skill File Upload
        # -----------------------------------------------------
        skill_file_path = None

        if skill_file:
            if not skill_file.filename.endswith(".md"):
                raise ValidationError("Only .md skill files are allowed")

            upload_dir = os.path.join(settings.UPLOADS_DIR, "skills")
            os.makedirs(upload_dir, exist_ok=True)

            file_name = f"{uuid4()}.md"
            full_path = os.path.join(upload_dir, file_name)

            content = await skill_file.read()

            # Optional size limit (1 MB recommended)
            if len(content) > 1_000_000:
                raise ValidationError("Skill file too large")

            with open(full_path, "wb") as f:
                f.write(content)

            skill_file_path = full_path

        # -----------------------------------------------------
        # 4️⃣ Validate Instruction Source (Recommended)
        # -----------------------------------------------------
        if not data.system_prompt and not skill_file_path:
            # Allowed but warn via validation if desired
            pass

        # -----------------------------------------------------
        # 5️⃣ Create Agent ORM Object
        # -----------------------------------------------------
        agent = Agent(
            name=data.name,
            description=data.description,
            system_prompt=data.system_prompt,
            skill_file_path=skill_file_path,
            llm_config_id=llm_id,
            parent_agent_id=data.parent_agent_id,
            domain_id=data.domain_id,
            is_active=data.is_active,
            run_in_sandbox=data.run_in_sandbox,
        )

        # -----------------------------------------------------
        # 6️⃣ Attach Tools (Many-to-Many)
        # -----------------------------------------------------
        if data.tool_ids:
            tools = await self.tool_repo.get_by_ids(data.tool_ids)

            if len(tools) != len(data.tool_ids):
                raise ValidationError("Some tools not found")

            agent.tools = tools

        # -----------------------------------------------------
        # 7️⃣ Persist to Database
        # -----------------------------------------------------
        agent = await self.repo.create(agent)

        return agent

    # =========================================================
    # UPLOAD / REPLACE SKILL FILE
    # =========================================================
    async def upload_skill_file(
        self,
        agent_id: UUID,
        file: UploadFile,
    ) -> Agent:
        """
        Upload or replace an agent's skill file (.md).
        """

        # -----------------------------------------------------
        # 1️⃣ Validate Agent Exists
        # -----------------------------------------------------
        agent = await self.repo.get(agent_id)

        if not agent:
            raise NotFoundError("Agent not found")

        # -----------------------------------------------------
        # 2️⃣ Validate File
        # -----------------------------------------------------
        if not file.filename or not file.filename.endswith(".md"):
            raise ValidationError("Only .md files are allowed")

        content = await file.read()

        if len(content) == 0:
            raise ValidationError("File is empty")

        if len(content) > 1_000_000:
            raise ValidationError("File too large")

        # -----------------------------------------------------
        # 3️⃣ Prepare Upload Directory
        # -----------------------------------------------------
        upload_dir = os.path.join(settings.UPLOADS_DIR, "skills")
        os.makedirs(upload_dir, exist_ok=True)

        # -----------------------------------------------------
        # 4️⃣ Delete Old File (if exists)
        # -----------------------------------------------------
        if agent.skill_file_path and os.path.exists(agent.skill_file_path):
            try:
                os.remove(agent.skill_file_path)
            except Exception:
                # Non-fatal — log in production
                pass

        # -----------------------------------------------------
        # 5️⃣ Save New File
        # -----------------------------------------------------
        file_name = f"{uuid4()}.md"
        full_path = os.path.join(upload_dir, file_name)

        with open(full_path, "wb") as f:
            f.write(content)

        # -----------------------------------------------------
        # 6️⃣ Update Agent Record
        # -----------------------------------------------------
        agent.skill_file_path = full_path

        await self.db.commit()
        await self.db.refresh(agent)

        return agent
    
    # =========================================================
    # DRY RUN 
    # =========================================================
    async def dry_run(
        self,
        agent_id: UUID,
        request: DryRunRequest,
    ) -> DryRunResponse:
        """
        Execute a single agent synchronously using ADK + Gemini.

        No Celery involved.
        """

        agent = await self.repo.get_with_relations(agent_id)

        if not agent:
            raise NotFoundError("Agent not found")

        if not agent.is_active:
            raise ValidationError("Agent is inactive")

        llm_config = agent.llm_config

        if llm_config is None:
            llm_config = await self.llm_repo.get_default()

            if llm_config is None:
                raise ValidationError("No LLM configuration available")

        context: Dict[str, Any] = {
            "user_prompt": request.prompt,
            "input_data": request.input_data or {},
        }

        start_time = time.perf_counter()

        output = await run_single_agent(
            agent=agent,
            llm_config=llm_config,
            context=context,
        )

        duration_ms = int((time.perf_counter() - start_time) * 1000)

        return DryRunResponse(
            agent_id=agent.id,
            agent_name=agent.name,
            output=output,
            duration_ms=duration_ms,
            model_used=llm_config.model_name,
        )
    
    # =========================================================
    # UPDATE AGENT
    # =========================================================
    async def update_agent(
        self,
        agent_id: UUID,
        data: AgentUpdate,
    ) -> Agent:
        """
        Update agent fields including sandbox configuration.
        """
        agent = await self.repo.get_with_relations(agent_id)
        
        if not agent:
            raise NotFoundError("Agent not found")
        
        # Update fields if provided
        if data.name is not None:
            agent.name = data.name
        
        if data.description is not None:
            agent.description = data.description
        
        if data.system_prompt is not None:
            agent.system_prompt = data.system_prompt
        
        if data.llm_config_id is not None:
            llm = await self.llm_repo.get(data.llm_config_id)
            if not llm:
                raise NotFoundError("LLM configuration not found")
            agent.llm_config_id = data.llm_config_id
        
        if data.parent_agent_id is not None:
            parent = await self.repo.get(data.parent_agent_id)
            if not parent:
                raise NotFoundError("Parent agent not found")
            agent.parent_agent_id = data.parent_agent_id
        
        if data.tool_ids is not None:
            tools = await self.tool_repo.get_by_ids(data.tool_ids)
            if len(tools) != len(data.tool_ids):
                raise ValidationError("Some tools not found")
            agent.tools = tools
        
        if data.is_active is not None:
            agent.is_active = data.is_active
        
        # Update sandbox configuration
        if data.run_in_sandbox is not None:
            agent.run_in_sandbox = data.run_in_sandbox
        
        if data.sandbox_config is not None:
            # Validate no path traversal in allowed_dir
            allowed_dir = data.sandbox_config.get("allowed_dir", "")
            if ".." in allowed_dir:
                raise ValidationError("allowed_dir must not contain path traversal sequences (..)")
            agent.sandbox_config = data.sandbox_config
        
        await self.db.commit()
        await self.db.refresh(agent)
        
        return agent
