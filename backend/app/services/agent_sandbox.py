"""
Agent Sandbox Executor — routes agent execution to Docker sandbox when enabled.

run_in_sandbox=False → normal in-process execution (existing behavior)
run_in_sandbox=True  → full agent execution inside Docker container
"""
import hashlib
import hmac
import logging
import os
import time
from typing import Any

from app.config import settings
from app.core.security import decrypt_api_key

logger = logging.getLogger(__name__)
audit_logger = logging.getLogger("agent_audit")

# Lazy Docker client initialization
_docker_client = None


def _get_docker_client():
    global _docker_client
    if _docker_client is None:
        try:
            import docker
            _docker_client = docker.from_env()
        except Exception as e:
            raise RuntimeError(f"Docker not available: {e}")
    return _docker_client


def _make_token(secret: str, agent_name: str, timestamp: str) -> str:
    """Generate HMAC token for sandbox authentication."""
    msg = f"{agent_name}:{timestamp}".encode()
    return hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()


def run_agent_in_sandbox(
    agent,
    llm_config,
    prompt: str,
    context: dict[str, Any],
) -> tuple[str, int]:
    """
    Execute agent inside Docker sandbox container.
    Returns (output, duration_ms).
    
    This is a SYNCHRONOUS function - safe to call from any thread.
    """
    try:
        import requests
    except ImportError as e:
        raise RuntimeError(f"Missing dependency: {e}. Run: pip install requests")
    
    cfg = agent.sandbox_config or {}
    allowed_dir = cfg.get("allowed_dir", "./uploads/agent_fs")
    image = cfg.get("image", "flowmind-agent-sandbox:latest")
    mem_limit = cfg.get("mem_limit", "512m")
    timeout_sec = int(cfg.get("timeout_seconds", 120))
    
    # Resolve absolute path — always relative to the backend root (where this file lives)
    _BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    if os.path.isabs(allowed_dir):
        allowed_dir_abs = allowed_dir.replace('\\', '/')
    else:
        # Resolve relative to backend root, not cwd
        allowed_dir_abs = os.path.normpath(
            os.path.join(_BACKEND_ROOT, allowed_dir)
        ).replace('\\', '/')
    
    os.makedirs(allowed_dir_abs.replace('/', os.sep), exist_ok=True)
    
    logger.info(f"[AgentSandbox] agent={agent.name} dir={allowed_dir_abs} image={image}")
    
    timestamp = str(int(time.time()))
    token = _make_token(settings.SANDBOX_HMAC_SECRET, agent.name, timestamp)
    
    try:
        client = _get_docker_client()
    except Exception as e:
        raise RuntimeError(f"Docker not available: {e}")
    
    container = None
    try:
        # Random port to avoid conflicts
        import random
        host_port = str(random.randint(49200, 49900))
        
        # Prepare agent configuration for sandbox
        api_key = decrypt_api_key(llm_config.api_key_encrypted)
        
        # Load system prompt
        system_prompt = ""
        if agent.skill_file_path:
            try:
                with open(agent.skill_file_path, "r", encoding="utf-8") as f:
                    system_prompt = f.read()
            except FileNotFoundError:
                pass
        system_prompt = system_prompt or agent.system_prompt or ""
        
        # Build agent config
        # For Ollama: replace localhost/127.0.0.1 with host.docker.internal
        # so the container can reach Ollama running on the host machine
        base_url = llm_config.base_url or ""
        if llm_config.provider.lower() == "ollama":
            base_url = (
                base_url
                .replace("localhost", "host.docker.internal")
                .replace("127.0.0.1", "host.docker.internal")
            ) or "http://host.docker.internal:11434"

        agent_config = {
            "name": agent.name,
            "system_prompt": system_prompt,
            "tools": [tool.function_name for tool in agent.tools],
            "model_config": {
                "provider": llm_config.provider.lower(),
                "model_name": llm_config.model_name,
                "api_key": api_key,
                "base_url": base_url,
            }
        }
        
        # Start container
        container = client.containers.run(
            image=image,
            detach=True,
            environment={
                "SANDBOX_HMAC_SECRET": settings.SANDBOX_HMAC_SECRET,
                "SANDBOX_TOKEN_TIMESTAMP": timestamp,
                "TAVILY_API_KEY": getattr(settings, "TAVILY_API_KEY", ""),
            },
            volumes={
                allowed_dir_abs: {"bind": "/sandbox/data", "mode": "rw"},
            },
            network_mode="bridge",
            ports={"8080/tcp": host_port},
            mem_limit=mem_limit,
            auto_remove=False,
        )
        
        logger.info(f"[AgentSandbox] Container started id={container.id[:12]} port={host_port}")
        
        # Wait for proxy to be ready
        ready = False
        for attempt in range(30):
            time.sleep(1.0)
            try:
                container.reload()
                if container.status == "exited":
                    logs = container.logs().decode("utf-8", errors="replace")
                    raise RuntimeError(
                        f"Container exited early (code={container.attrs.get('State', {}).get('ExitCode')}). "
                        f"Logs: {logs[:500]}"
                    )
                resp = requests.get(f"http://localhost:{host_port}/health", timeout=2)
                if resp.status_code == 200:
                    ready = True
                    logger.info(f"[AgentSandbox] Proxy ready after {attempt+1}s")
                    break
            except Exception as e:
                logger.debug(f"[AgentSandbox] Health check attempt {attempt+1} failed: {e}")
                continue
        
        if not ready:
            logs = container.logs().decode("utf-8", errors="replace")
            raise RuntimeError(f"Container not ready after 30s. Logs: {logs[:500]}")
        
        # Execute agent
        response = requests.post(
            f"http://localhost:{host_port}/execute",
            json={
                "agent_config": agent_config,
                "prompt": prompt,
                "context": context,
                "token": token,
            },
            timeout=timeout_sec,
        )
        
        if response.status_code == 401:
            raise RuntimeError("HMAC token rejected by sandbox")
        
        data = response.json()
        if data.get("error"):
            audit_logger.info(
                f"agent={agent.name} sandbox=True outcome=error container={container.id[:12]}"
            )
            raise RuntimeError(f"Agent error: {data['error']}")
        
        output = data.get("output", "")
        duration_ms = data.get("duration_ms", 0)
        
        audit_logger.info(
            f"agent={agent.name} sandbox=True outcome=success "
            f"duration={duration_ms}ms container={container.id[:12]}"
        )
        
        return output, duration_ms
    
    except requests.Timeout:
        raise RuntimeError(f"Agent execution timed out after {timeout_sec}s")
    except Exception as exc:
        raise RuntimeError(f"Sandbox execution failed: {exc}")
    finally:
        if container is not None:
            try:
                container.stop(timeout=3)
                container.remove(force=True)
            except Exception:
                pass
