from __future__ import annotations

import json
import logging
from time import perf_counter
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task, TaskWorkflowStep
from app.repositories.task import TaskRepository
from app.repositories.agent import AgentRepository
from app.repositories.llm_config import LLMConfigRepository
from app.schemas.task import (
    TaskCreate,
    TaskUpdate,
    AutoSuggestRequest,
    AutoSuggestResponse,
    SuggestedStep,
    DryRunRequest,
    DryRunResponse,
)
from app.core.exceptions import NotFoundError, ValidationError
from app.core.security import decrypt_api_key

logger = logging.getLogger(__name__)


class TaskService:
    """Business logic for Task CRUD, auto-suggest, and dry-run."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = TaskRepository(db)
        self.agent_repo = AgentRepository(db)
        self.llm_repo = LLMConfigRepository(db)

    # ── CRUD ──────────────────────────────────────────────────────────

    async def create_task(self, data: TaskCreate) -> Task:
        """Validate agents, re-index steps 1..N, persist Task + steps."""
        agent_ids = [s.agent_id for s in data.steps]
        if agent_ids:
            found = await self.agent_repo.get_by_ids(agent_ids)
            found_ids = {a.id for a in found}
            missing = set(agent_ids) - found_ids
            if missing:
                raise ValidationError(f"Unknown agent IDs: {[str(m) for m in missing]}")

        task = Task(name=data.name, description=data.description)
        self.db.add(task)
        await self.db.flush()  # get task.id

        sorted_steps = sorted(data.steps, key=lambda s: s.step_order)
        for i, step_data in enumerate(sorted_steps, start=1):
            step = TaskWorkflowStep(
                task_id=task.id,
                agent_id=step_data.agent_id,
                step_order=i,
                llm_override_id=step_data.llm_override_id,
                step_config=step_data.step_config,
            )
            self.db.add(step)

        await self.db.commit()
        return await self.repo.get_with_steps(task.id)

    async def get_task(self, task_id: UUID) -> Task:
        task = await self.repo.get_with_steps(task_id)
        if not task:
            raise NotFoundError(f"Task {task_id} not found")
        return task

    async def list_tasks(self) -> list[Task]:
        return await self.repo.list_all()

    async def update_task(self, task_id: UUID, data: TaskUpdate) -> Task:
        """Fetch, apply scalar updates, replace steps if provided, commit once."""
        task = await self.repo.get_with_steps(task_id)
        if not task:
            raise NotFoundError(f"Task {task_id} not found")

        if data.name is not None:
            task.name = data.name
        if data.description is not None:
            task.description = data.description
        if data.is_active is not None:
            task.is_active = data.is_active

        if data.steps is not None:
            agent_ids = [s.agent_id for s in data.steps]
            if agent_ids:
                found = await self.agent_repo.get_by_ids(agent_ids)
                found_ids = {a.id for a in found}
                missing = set(agent_ids) - found_ids
                if missing:
                    raise ValidationError(f"Unknown agent IDs: {[str(m) for m in missing]}")

            sorted_steps = sorted(data.steps, key=lambda s: s.step_order)
            new_steps = [
                TaskWorkflowStep(
                    task_id=task.id,
                    agent_id=step_data.agent_id,
                    step_order=i,
                    llm_override_id=step_data.llm_override_id,
                    step_config=step_data.step_config,
                )
                for i, step_data in enumerate(sorted_steps, start=1)
            ]
            await self.repo.replace_steps(task, new_steps)

        await self.db.commit()
        return await self.repo.get_with_steps(task_id)

    async def delete_task(self, task_id: UUID) -> None:
        deleted = await self.repo.delete(task_id)
        if not deleted:
            raise NotFoundError(f"Task {task_id} not found")

    # ── Auto-Suggest ──────────────────────────────────────────────────

    async def auto_suggest(self, request: AutoSuggestRequest) -> AutoSuggestResponse:
        """Use LLM to suggest an ordered agent workflow for a task description."""
        agents = await self.agent_repo.get_top_level(active_only=True)

        agent_list = [
            {
                "id": str(a.id),
                "name": a.name,
                "description": a.description or "",
                "tools": [t.name for t in a.tools],
            }
            for a in agents
        ]

        prompt = self._build_planner_prompt(request.task_description, agent_list)

        llm_config = await self.llm_repo.get_default()
        if not llm_config:
            raise ValidationError("No default LLM configuration found")

        raw_response = await self._call_llm(prompt, llm_config)
        steps_data = self._parse_json_response(raw_response)

        # Validate all agent_ids exist
        all_agent_ids = {a.id for a in agents}
        validated_steps = []
        for item in steps_data:
            try:
                aid = UUID(str(item.get("agent_id", "")))
            except (ValueError, AttributeError):
                raise ValidationError(f"Invalid agent_id in LLM response: {item.get('agent_id')}")
            if aid not in all_agent_ids:
                raise ValidationError(f"LLM returned unknown agent_id: {aid}")
            agent_name = next((a.name for a in agents if a.id == aid), item.get("agent_name", ""))
            validated_steps.append(
                SuggestedStep(
                    agent_id=aid,
                    agent_name=agent_name,
                    reason=item.get("reason", ""),
                    step_order=item.get("step_order", len(validated_steps) + 1),
                )
            )

        return AutoSuggestResponse(steps=validated_steps)

    def _build_planner_prompt(self, task_description: str, agent_list: list[dict]) -> str:
        agents_json = json.dumps(agent_list, indent=2)
        return f"""You are a workflow planner. Given a task description and a list of available agents, return a JSON array of steps.

Task: {task_description}

Available agents:
{agents_json}

Return ONLY valid JSON array (no markdown, no explanation):
[{{"agent_id":"<uuid>","agent_name":"<name>","reason":"<why this agent>","step_order":1}}, ...]

Rules:
1. Only use agent IDs from the available agents list above.
2. Order steps logically for the task.
3. Each step must have a unique step_order starting from 1.
4. Return ONLY the JSON array, nothing else."""

    async def _call_llm(self, prompt: str, llm_config) -> str:
        """Call LLM directly — supports Gemini and OpenAI-compatible providers."""
        api_key = decrypt_api_key(llm_config.api_key_encrypted)
        provider = llm_config.provider.lower()
        model_name = llm_config.model_name or "gemini-2.0-flash"

        if provider == "gemini":
            from google import genai
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(model=model_name, contents=prompt)
            return response.text

        elif provider in ("openai", "ollama", "anthropic"):
            import openai
            base_url = llm_config.base_url or None
            if provider == "ollama":
                raw = (base_url or "http://localhost:11434").rstrip("/")
                base_url = raw if raw.endswith("/v1") else f"{raw}/v1"
                api_key = api_key or "ollama"
            client = openai.AsyncOpenAI(api_key=api_key, base_url=base_url)
            resp = await client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.2,
            )
            return resp.choices[0].message.content

        raise ValidationError(f"Unsupported LLM provider: {provider}")

    def _parse_json_response(self, text: str) -> list[dict]:
        """Strip markdown fences and parse JSON array."""
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        try:
            data = json.loads(text)
            if not isinstance(data, list):
                raise ValueError("Expected JSON array")
            return data
        except Exception as e:
            logger.error(f"Failed to parse LLM response: {e}\nResponse: {text}")
            raise ValidationError("Failed to parse LLM response as JSON array")

    async def dry_run_stream(self, task_id: UUID, request: DryRunRequest):
        """Stream step results one by one using ADK SequentialAgent."""
        from app.workers.execution_engine import run_workflow_stream

        task = await self.repo.get_with_steps(task_id)
        if not task:
            raise NotFoundError(f"Task {task_id} not found")
        if not task.steps:
            raise ValidationError("Task has no steps to execute")

        sorted_steps = sorted(task.steps, key=lambda s: s.step_order)
        default_llm = await self.llm_repo.get_default()
        if not default_llm:
            raise ValidationError("No default LLM configuration found")

        effective_input = {
            "task": task.name,
            "description": task.description or task.name,
            **request.input_data,
        }

        async for step_result in run_workflow_stream(sorted_steps, default_llm, effective_input):
            yield step_result

    # ── Dry Run ───────────────────────────────────────────────────────

    async def dry_run(self, task_id: UUID, request: DryRunRequest) -> DryRunResponse:
        """Execute all steps sequentially via ADK SequentialAgent."""
        from app.workers.execution_engine import run_workflow

        task = await self.repo.get_with_steps(task_id)
        if not task:
            raise NotFoundError(f"Task {task_id} not found")

        if not task.steps:
            raise ValidationError("Task has no steps to execute")

        sorted_steps = sorted(task.steps, key=lambda s: s.step_order)

        default_llm = await self.llm_repo.get_default()
        if not default_llm:
            raise ValidationError("No default LLM configuration found")

        t0 = perf_counter()

        # Merge task context into input_data so step 1 always has the task goal
        effective_input = {
            "task": task.name,
            "description": task.description or task.name,
            **request.input_data,
        }

        results = await run_workflow(sorted_steps, default_llm, effective_input)
        total_ms = int((perf_counter() - t0) * 1000)

        return DryRunResponse(
            task_id=task.id,
            task_name=task.name,
            results=results,
            total_duration_ms=total_ms,
        )
