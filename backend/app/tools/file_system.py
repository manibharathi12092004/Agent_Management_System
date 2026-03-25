
from pathlib import Path

# Root directory for all filesystem operations
BASE_DIR = Path("uploads/agent_fs").resolve()


def _safe_path(user_path: str) -> Path:
    """
    Prevent path traversal attacks by resolving against BASE_DIR.
    """
    target = (BASE_DIR / user_path).resolve()


    if not str(target).startswith(str(BASE_DIR)):
        raise ValueError("Access outside allowed directory is forbidden.")

    return target


# ---------------------------------------------------------
# TOOL FUNCTIONS 
# ---------------------------------------------------------

def list_files(path: str = "") -> str:
    """
    List files in a directory.

    Args:
        path: Relative directory path inside allowed filesystem.

    Returns:
        Newline-separated file names.
    """
    target = _safe_path(path)

    if not target.exists():
        return "Directory does not exist."

    if not target.is_dir():
        return "Path is not a directory."

    files = [p.name for p in target.iterdir()]
    return "\n".join(files) if files else "Directory is empty."


def read_file(path: str) -> str:
    """
    Read the contents of a file.

    Args:
        path: Relative file path.

    Returns:
        File contents as string.
    """
    target = _safe_path(path)

    if not target.exists():
        return "File does not exist."

    if not target.is_file():
        return "Path is not a file."

    return target.read_text(encoding="utf-8")


def count_lines(path: str) -> str:
    """
    Count lines in a file.

    Args:
        path: Relative file path.

    Returns:
        Line count string.
    """
    target = _safe_path(path)

    if not target.exists() or not target.is_file():
        return "File does not exist."

    with target.open("r", encoding="utf-8") as f:
        line_count = sum(1 for _ in f)

    return f"Lines: {line_count}"


def write_file(path: str, content: str) -> str:
    """
    Create or overwrite a file.

    Args:
        path: Relative file path.
        content: Text to write.

    Returns:
        Success message.
    """
    target = _safe_path(path)

    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")

    return "File written successfully."