"""
Agent Execution Engine — Google ADK + Gemini

Runs a single agent with:
- Gemini LLM (via Google ADK)
- Tool invocation
- Skill file or system prompt
- Context support
- DB-stored encrypted API keys

Used for:
- Agent dry-run (synchronous)
- Future workflow execution
"""

from __future__ import annotations

import os
import uuid
from typing import Dict, Any
import re

from google.adk.agents import LlmAgent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types as genai_types

from app.models.agent import Agent
from app.models.llm_config import LLMConfig
from app.tools.registry import get_tool_functions
from app.core.security import decrypt_api_key
from app.core.exceptions import LLMExecutionError


# =====================================================================
# Internal Helpers
# =====================================================================
def _sanitize_agent_name(name: str) -> str:
    """
    Convert arbitrary agent name into ADK-safe identifier.
    """

    # Replace non-alphanumeric with underscore
    safe = re.sub(r"\W+", "_", name)

    # Ensure starts with letter or underscore
    if not re.match(r"[A-Za-z_]", safe):
        safe = "_" + safe

    return safe


def _build_model_string(llm_config: LLMConfig) -> str:
    """
    Convert provider + model into ADK-compatible model string.
    """

    provider_map = {
        "gemini": llm_config.model_name,
        "openai": f"openai/{llm_config.model_name}",
        "anthropic": f"anthropic/{llm_config.model_name}",
        "ollama": f"ollama/{llm_config.model_name}",
    }

    return provider_map.get(llm_config.provider, llm_config.model_name)


def _load_system_prompt(agent: Agent) -> str:
    """
    Load agent instructions.

    Priority:
    1) Skill file (.md)
    2) Inline system_prompt
    """

    if agent.skill_file_path:
        try:
            with open(agent.skill_file_path, "r", encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            pass  # fallback to inline prompt

    return agent.system_prompt or ""


def _set_provider_api_key(llm_config: LLMConfig) -> None:
    """
    Set runtime environment variables for LLM providers
    using DB-stored encrypted API keys.
    """

    api_key = decrypt_api_key(llm_config.api_key_encrypted)

    provider = llm_config.provider.lower()

    if provider == "gemini":
        os.environ["GOOGLE_API_KEY"] = api_key

    elif provider == "openai":
        os.environ["OPENAI_API_KEY"] = api_key

    elif provider == "anthropic":
        os.environ["ANTHROPIC_API_KEY"] = api_key

    elif llm_config.provider == "ollama":
        # Usually local; API key may not be required
        pass

    else:
        raise ValueError(f"Unsupported LLM provider: {llm_config.provider}")


# =====================================================================
# Public Execution Function
# =====================================================================

async def run_single_agent(
    agent: Agent,
    llm_config: LLMConfig,
    context: Dict[str, Any] | None = None,
) -> str:
    """
    Execute a single agent using Google ADK.

    Args:
        agent: Agent ORM object (with tools loaded)
        llm_config: Associated LLM configuration
        context: Optional input context

    Returns:
        Final text response from the agent
    """

    try:
        # -------------------------------------------------------------
        # 1. Configure provider API key (from DB)
        # -------------------------------------------------------------
        _set_provider_api_key(llm_config)

        # -------------------------------------------------------------
        # 2. Prepare system instructions
        # -------------------------------------------------------------
        system_prompt = _load_system_prompt(agent)

        # -------------------------------------------------------------
        # 3. Load tool functions
        # -------------------------------------------------------------
        tool_functions = get_tool_functions(
            [tool.function_name for tool in agent.tools]
        )

        # -------------------------------------------------------------
        # 4. Create ADK Agent
        # -------------------------------------------------------------
        adk_agent = LlmAgent(
            name=_sanitize_agent_name(agent.name),
            model=_build_model_string(llm_config),
            description=agent.description or "",
            instruction=system_prompt,
            tools=tool_functions,
        )

        # -------------------------------------------------------------
        # 5. Create Runner + Session
        # -------------------------------------------------------------
        session_service = InMemorySessionService()

        runner = Runner(
            agent=adk_agent,
            app_name="ai_workflow",
            session_service=session_service,
        )

        # -------------------------------------------------------------
        # 6. Build user prompt
        # -------------------------------------------------------------
        prompt = f"""
Context:
{context or {}}

Execute your assigned role and produce the best possible result.
"""
        # -------------------------------------------------------------
        # 7. Create session (REQUIRED by ADK)
        # -------------------------------------------------------------
        session_id = f"dryrun_agent_{agent.id}"
        user_id = "dryrun_user"

        await session_service.create_session(
            app_name="ai_workflow",
            user_id=user_id,
            session_id=session_id,
        )

        # -------------------------------------------------------------
        # 8. Execute agent
        # -------------------------------------------------------------
        response_text = ""

        async for event in runner.run_async(
            user_id="dryrun_user",
            session_id=f"dryrun_agent_{agent.id}",
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