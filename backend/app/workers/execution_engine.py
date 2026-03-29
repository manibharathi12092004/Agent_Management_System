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
from datetime import datetime
from time import perf_counter
from typing import Dict, Any, AsyncIterator

from google.adk.agents import LlmAgent
from google.adk.agents.sequential_agent import SequentialAgent
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


def _build_model(llm_config: LLMConfig):
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
        if not base_url.endswith("/v1"):
            base_url = f"{base_url}/v1"
        return LiteLlm(model=f"openai/{model_name}", api_base=base_url, api_key="ollama")

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
    provider = llm_config.provider.lower()
    api_key = decrypt_api_key(llm_config.api_key_encrypted)

    if provider == "gemini":
        os.environ["GOOGLE_API_KEY"] = api_key
    elif provider == "openai":
        os.environ["OPENAI_API_KEY"] = api_key
    elif provider == "anthropic":
        os.environ["ANTHROPIC_API_KEY"] = api_key
    elif provider == "ollama":
        pass
    else:
        raise ValueError(f"Unsupported LLM provider: {llm_config.provider}")


def _cleanup_provider_env() -> None:
    for var in ["OPENAI_API_KEY", "OPENAI_API_BASE", "OPENAI_BASE_URL",
                "GOOGLE_API_KEY", "ANTHROPIC_API_KEY"]:
        os.environ.pop(var, None)


# =====================================================================
# SINGLE AGENT EXECUTION  (used by agent dry-run)
# =====================================================================

async def run_single_agent(
    agent: Agent,
    llm_config: LLMConfig,
    context: Dict[str, Any] | None = None,
) -> str:

    try:
        _set_provider_api_key(llm_config)
        system_prompt = _load_system_prompt(agent)
        tool_functions = get_tool_functions(
            [tool.function_name for tool in agent.tools]
        )

        adk_agent = LlmAgent(
            name=_sanitize_agent_name(agent.name),
            model=_build_model(llm_config),
            description=agent.description or "",
            instruction=system_prompt,
            tools=tool_functions,
        )

        session_service = InMemorySessionService()
        runner = Runner(
            agent=adk_agent,
            app_name="ai_workflow",
            session_service=session_service,
        )

        now = datetime.now().strftime("%Y-%m-%d %H:%M")
        prompt = f"""Current date and time: {now}

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
# WORKFLOW EXECUTION — ADK SequentialAgent with live streaming
# =====================================================================

async def run_workflow_stream(
    steps: list,
    default_llm_config,
    input_data: dict,
) -> AsyncIterator[dict]:
    """
    Execute a multi-step workflow using ADK SequentialAgent.

    - Step 1: input embedded directly in instruction (no session state needed)
    - Step 2+: reads {step_N_output} from ADK session state (native chaining)
    - Per-step timing: tracked by watching when each output_key appears in state
    - Yields each step result as soon as it completes (for live streaming)
    - Stops on first failure and marks remaining steps as skipped
    """
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    adk_agents = []

    for i, step in enumerate(steps, start=1):
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
            # Embed input directly — avoids session state injection issue
            user_input_str = json.dumps(input_data) if input_data else "Execute your task."
            instruction = (
                f"{system_prompt}\n\n"
                f"Current date and time: {now}\n\n"
                f"Task input:\n{user_input_str}"
            )
        else:
            # ADK substitutes {step_N_output} from session state written by previous agent
            prev_key = f"step_{i - 1}_output"
            task_ctx = json.dumps({
                k: v for k, v in input_data.items()
                if k in ("task", "description")
            })
            instruction = (
                f"{system_prompt}\n\n"
                f"Current date and time: {now}\n\n"
                f"Task context: {task_ctx}\n\n"
                f"Previous step output:\n{{{prev_key}}}"
            )

        tool_functions = get_tool_functions(
            [tool.function_name for tool in step.agent.tools]
        )

        adk_agent = LlmAgent(
            name=_sanitize_agent_name(f"{step.agent.name}_step{i}"),
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

    await session_service.create_session(
        app_name="ai_workflow",
        user_id=user_id,
        session_id=session_id,
    )

    # Track which steps have been yielded and their start times
    completed_steps: set[int] = set()
    step_start_times: dict[int, float] = {1: perf_counter()}
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
            # After every event, check if any new step output appeared in state
            current_session = await session_service.get_session(
                app_name="ai_workflow",
                user_id=user_id,
                session_id=session_id,
            )
            state = current_session.state if current_session else {}

            for i, step in enumerate(steps, start=1):
                if i in completed_steps:
                    continue

                output_key = f"step_{i}_output"
                if output_key in state:
                    t_end = perf_counter()
                    t_start = step_start_times.get(i, t_end)
                    duration_ms = int((t_end - t_start) * 1000)
                    output = state[output_key]

                    completed_steps.add(i)

                    # Record start time for next step
                    if i + 1 <= len(steps):
                        step_start_times[i + 1] = perf_counter()

                    yield {
                        "step_order": step.step_order,
                        "agent_id": str(step.agent_id),
                        "agent_name": step.agent.name,
                        "output": output,
                        "duration_ms": duration_ms,
                        "error": None,
                        "skipped": False,
                    }

    except Exception as exc:
        pipeline_error = str(exc)

    # Yield any steps that failed (no output in state) or were skipped
    failed_emitted = False
    for i, step in enumerate(steps, start=1):
        if i in completed_steps:
            continue

        output_key = f"step_{i}_output"

        if not failed_emitted:
            # This is the step that failed
            failed_emitted = True
            yield {
                "step_order": step.step_order,
                "agent_id": str(step.agent_id),
                "agent_name": step.agent.name,
                "output": "",
                "duration_ms": 0,
                "error": pipeline_error or "Step did not produce output",
                "skipped": False,
            }
        else:
            # Subsequent steps were never run
            yield {
                "step_order": step.step_order,
                "agent_id": str(step.agent_id),
                "agent_name": step.agent.name,
                "output": "",
                "duration_ms": 0,
                "error": None,
                "skipped": True,
            }

    _cleanup_provider_env()


async def run_workflow(
    steps: list,
    default_llm_config,
    input_data: dict,
) -> list:
    """Collect all streaming results into a list (used by synchronous dry-run endpoint)."""
    results = []
    async for result in run_workflow_stream(steps, default_llm_config, input_data):
        results.append(result)
    return results
