"""
Agent Execution Engine — Google ADK + Multi-Provider

Supports:
- Gemini
- OpenAI
- Anthropic
- Ollama (OpenAI-compatible via LiteLlm)
"""

from __future__ import annotations

import os
import re
import json
from typing import Dict, Any

from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types as genai_types

from app.models.agent import Agent
from app.models.llm_config import LLMConfig
from app.tools.registry import get_tool_functions
from app.core.security import decrypt_api_key
from app.core.exceptions import LLMExecutionError


# =====================================================================
# Helpers
# =====================================================================

def _sanitize_agent_name(name: str) -> str:
    safe = re.sub(r"\W+", "_", name)
    if not re.match(r"[A-Za-z_]", safe):
        safe = "_" + safe
    return safe


# ⭐ MODEL STRING BUILDER (NO LiteLLM)

def _build_model(llm_config: LLMConfig):
    """
    Returns a model string for Gemini (native ADK)
    or a LiteLlm wrapper for OpenAI / Anthropic / Ollama.
    """
    provider = llm_config.provider.lower()
    model_name = llm_config.model_name
    api_key = decrypt_api_key(llm_config.api_key_encrypted)

    if provider == "gemini":
        return model_name

    if provider == "openai":
        return LiteLlm(model=f"openai/{model_name}", api_key=api_key)

    if provider == "anthropic":
        return LiteLlm(model=f"anthropic/{model_name}", api_key=api_key)

    if provider == "ollama":
        base_url = (llm_config.base_url or "http://localhost:11434").rstrip("/")
        return LiteLlm(
            model=f"openai/{model_name}",
            api_base=f"{base_url}/v1",
            api_key="ollama",
        )

    raise ValueError(f"Unsupported LLM provider: {llm_config.provider}")


def _load_system_prompt(agent: Agent) -> str:
    if agent.skill_file_path:
        try:
            with open(agent.skill_file_path, "r", encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            pass

    return agent.system_prompt or ""


# =====================================================================
# Provider Environment Setup
# =====================================================================

def _set_provider_api_key(llm_config: LLMConfig) -> None:
    """Only Gemini needs an env var — all other providers pass creds into LiteLlm directly."""
    provider = llm_config.provider.lower()
    api_key = decrypt_api_key(llm_config.api_key_encrypted)

    if provider == "gemini":
        os.environ["GOOGLE_API_KEY"] = api_key
    elif provider == "openai":
        os.environ["OPENAI_API_KEY"] = api_key
    elif provider == "anthropic":
        os.environ["ANTHROPIC_API_KEY"] = api_key
    elif provider == "ollama":
        pass  # api_base and api_key passed directly into LiteLlm
    else:
        raise ValueError(f"Unsupported LLM provider: {llm_config.provider}")


def _cleanup_provider_env() -> None:
    for var in [
        "OPENAI_API_KEY",
        "OPENAI_API_BASE",
        "OPENAI_BASE_URL",
        "GOOGLE_API_KEY",
        "ANTHROPIC_API_KEY",
    ]:
        os.environ.pop(var, None)


# =====================================================================
# PUBLIC EXECUTION FUNCTION
# =====================================================================

async def run_single_agent(
    agent: Agent,
    llm_config: LLMConfig,
    context: Dict[str, Any] | None = None,
) -> str:

    try:
        # 1️⃣ Configure provider
        _set_provider_api_key(llm_config)

        # 2️⃣ Load instructions
        system_prompt = _load_system_prompt(agent)

        # 3️⃣ Load tools
        tool_functions = get_tool_functions(
            [tool.function_name for tool in agent.tools]
        )

        # 4️⃣ Create ADK agent
        adk_agent = LlmAgent(
            name=_sanitize_agent_name(agent.name),
            model=_build_model(llm_config),
            description=agent.description or "",
            instruction=system_prompt,
            tools=tool_functions,
        )

        # 5️⃣ Runner + session
        session_service = InMemorySessionService()

        runner = Runner(
            agent=adk_agent,
            app_name="ai_workflow",
            session_service=session_service,
        )

        # 6️⃣ Prompt
        prompt = f"""
Context:
{json.dumps(context or {}, indent=2)}

Execute your assigned role and produce the best possible result.
"""

        session_id = f"dryrun_agent_{agent.id}"
        user_id = "dryrun_user"

        await session_service.create_session(
            app_name="ai_workflow",
            user_id=user_id,
            session_id=session_id,
        )

        # 7️⃣ Run agent
        response_text = ""

        async for event in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=genai_types.Content(
                role="user",
                parts=[genai_types.Part(text=prompt)],
            ),
        ):
            if event.is_final_response() and event.content:
                for part in event.content.parts:
                    if hasattr(part, "text"):
                        response_text += part.text

        return response_text.strip()

    except Exception as exc:
        raise LLMExecutionError(agent.name, str(exc))

    finally:
        _cleanup_provider_env()


# =====================================================================
# WORKFLOW EXECUTION (SequentialAgent pipeline)
# =====================================================================

async def run_workflow(
    steps: list,          # list of TaskWorkflowStep ORM objects sorted by step_order
    default_llm_config,   # LLMConfig ORM object
    input_data: dict,
) -> list:                # list of StepResult dicts
    """
    Execute a multi-step workflow using ADK SequentialAgent.
    Each step becomes an LlmAgent with output_key=f"step_{i}_output".
    ADK passes state between agents via {variable} template substitution.
    """
    from google.adk.agents.sequential_agent import SequentialAgent
    from time import perf_counter

    adk_agents = []

    for i, step in enumerate(steps, start=1):
        # Resolve llm_config: step override → agent's config → default
        llm_config = (
            step.llm_override
            or getattr(step.agent, "llm_config", None)
            or default_llm_config
        )

        _set_provider_api_key(llm_config)
        model = _build_model(llm_config)
        system_prompt = _load_system_prompt(step.agent)

        output_key = f"step_{i}_output"

        if i == 1:
            instruction = f"{system_prompt}\n\nUser input: {{user_input}}"
        else:
            prev_key = f"step_{i - 1}_output"
            instruction = f"{system_prompt}\n\nPrevious step output:\n{{{prev_key}}}"

        tool_functions = get_tool_functions(
            [tool.function_name for tool in step.agent.tools]
        )

        sanitized_name = _sanitize_agent_name(f"{step.agent.name}_step{i}")

        adk_agent = LlmAgent(
            name=sanitized_name,
            model=model,
            instruction=instruction,
            tools=tool_functions,
            output_key=output_key,
        )
        adk_agents.append(adk_agent)

    sequential = SequentialAgent(
        name="workflow_pipeline",
        sub_agents=adk_agents,
    )

    session_service = InMemorySessionService()
    runner = Runner(
        agent=sequential,
        app_name="ai_workflow",
        session_service=session_service,
    )

    session_id = "workflow_run"
    user_id = "workflow_user"

    session = await session_service.create_session(
        app_name="ai_workflow",
        user_id=user_id,
        session_id=session_id,
    )

    # Inject initial input into session state
    session.state["user_input"] = json.dumps(input_data)

    t0 = perf_counter()
    pipeline_error: str | None = None

    try:
        async for event in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=genai_types.Content(
                role="user",
                parts=[genai_types.Part(text=json.dumps(input_data))],
            ),
        ):
            pass  # SequentialAgent manages sub-agent execution internally
    except Exception as exc:
        pipeline_error = str(exc)

    # Retrieve final session state
    final_session = await session_service.get_session(
        app_name="ai_workflow",
        user_id=user_id,
        session_id=session_id,
    )
    state = final_session.state if final_session else {}

    total_elapsed = perf_counter() - t0
    per_step_ms = int((total_elapsed * 1000) / len(steps)) if steps else 0

    results = []
    failed_at: int | None = None  # step index (1-based) where failure occurred

    for i, step in enumerate(steps, start=1):
        output_key = f"step_{i}_output"
        output = state.get(output_key, "")

        if failed_at is not None:
            # Steps after the failure were never executed — mark as skipped
            results.append({
                "step_order": step.step_order,
                "agent_id": str(step.agent_id),
                "agent_name": step.agent.name,
                "output": "",
                "duration_ms": 0,
                "error": None,
                "skipped": True,
            })
            continue

        if not output and pipeline_error:
            # This step failed — record error and stop processing further steps
            failed_at = i
            results.append({
                "step_order": step.step_order,
                "agent_id": str(step.agent_id),
                "agent_name": step.agent.name,
                "output": "",
                "duration_ms": per_step_ms,
                "error": pipeline_error,
                "skipped": False,
            })
        else:
            results.append({
                "step_order": step.step_order,
                "agent_id": str(step.agent_id),
                "agent_name": step.agent.name,
                "output": output,
                "duration_ms": per_step_ms,
                "error": None,
                "skipped": False,
            })

    _cleanup_provider_env()
    return results
