from typing import Callable, Dict, List

from app.tools.file_system import (
    list_files,
    read_file,
    count_lines,
    write_file,
)
from app.tools.web_tools import web_tool

# ---------------------------------------------------------
# UNIFIED FILESYSTEM TOOL
# ---------------------------------------------------------

def file_system(
    action: str,
    path: str = "",
    content: str = "",
) -> str:
    """
    Unified filesystem tool entry point.

    Args:
        action: One of ["list", "read", "count", "write"]
        path: File or directory path
        content: Used only for write action
    """

    if action == "list":
        return list_files(path)

    if action == "read":
        return read_file(path)

    if action == "count":
        return count_lines(path)

    if action == "write":
        return write_file(path, content)

    return "Unknown filesystem action."


# ---------------------------------------------------------
# GLOBAL TOOL REGISTRY
# ---------------------------------------------------------

TOOL_REGISTRY: Dict[str, Callable] = {
    # Matches DB function_name
    "file_system": file_system,
    "web_tool": web_tool,
}


# ---------------------------------------------------------
# PUBLIC API
# ---------------------------------------------------------

def get_tool_function(name: str) -> Callable:
    """
    Get a single tool function by name.
    """
    if name not in TOOL_REGISTRY:
        raise KeyError(f"Tool '{name}' is not registered.")
    return TOOL_REGISTRY[name]


def get_tool_functions(names: List[str]) -> List[Callable]:
    """
    Get multiple tool functions for agent execution.
    Unknown tools are ignored (safe behavior).
    """
    return [
        TOOL_REGISTRY[name]
        for name in names
        if name in TOOL_REGISTRY
    ]


def list_available_tools() -> List[str]:
    """
    Return all registered tool names.
    """
    return list(TOOL_REGISTRY.keys())