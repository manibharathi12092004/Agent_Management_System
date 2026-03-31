from typing import Callable, Dict, List

from app.tools.file_system import (
    list_files,
    read_file,
    count_lines,
    write_file,
    search_files,
)
from app.tools.web_tools import web_tool

# ---------------------------------------------------------
# UNIFIED FILESYSTEM TOOL
# ---------------------------------------------------------

def file_system(
    action: str,
    path: str = "",
    content: str = "",
    keyword: str = "",
) -> str:
    """
    Unified filesystem tool for file operations in a sandboxed directory.
    
    CRITICAL: You MUST call this function to perform file operations. Do NOT just describe what you would do.
    
    Actions:
    - "list": List all files in a directory. Requires: path (optional, defaults to root)
    - "read": Read contents of a file. Requires: path
    - "count": Count lines in a file. Requires: path
    - "write": Create/write a file. Requires: path, content
    - "search": Search for keyword in files. Requires: keyword, path (optional)
    
    Examples:
    - file_system(action="write", path="report.md", content="# My Report\\n\\nContent here")
    - file_system(action="list", path="")
    - file_system(action="read", path="report.md")
    
    Args:
        action: One of ["list", "read", "count", "write", "search"]
        path: File or directory path (relative to sandbox root)
        content: File content (required for write action)
        keyword: Search term (required for search action)
    
    Returns:
        String result of the operation
    """

    if action == "list":
        return list_files(path)

    if action == "read":
        return read_file(path)

    if action == "count":
        return count_lines(path)

    if action == "write":
        return write_file(path, content)

    if action == "search":
        if not keyword:
            return "Please provide a keyword to search for."
        return search_files(keyword, path)

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