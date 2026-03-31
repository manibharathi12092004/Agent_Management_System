
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
    Create a file. If the filename already exists, appends _1, _2, etc.
    to avoid overwriting existing files.

    Args:
        path: Relative file path.
        content: Text to write.

    Returns:
        Success message with the actual filename used.
    """
    target = _safe_path(path)
    target.parent.mkdir(parents=True, exist_ok=True)

    # Auto-increment filename if it already exists
    if target.exists():
        stem = target.stem
        suffix = target.suffix
        counter = 1
        while target.exists():
            target = target.parent / f"{stem}_{counter}{suffix}"
            counter += 1

    target.write_text(content, encoding="utf-8")
    return f"File written successfully: {target.name}"


def search_files(keyword: str, path: str = "") -> str:
    """
    Search for a keyword across all files in a directory (recursive).

    Args:
        keyword: Word or phrase to search for.
        path: Relative directory path to search in (default: root).

    Returns:
        Each matching file's path and the lines containing the keyword.
    """
    target = _safe_path(path)

    if not target.exists():
        return "Directory does not exist."

    if not target.is_dir():
        return "Path is not a directory."

    keyword_lower = keyword.lower()
    results = []

    for file in target.rglob("*"):
        if not file.is_file():
            continue
        try:
            lines = file.read_text(encoding="utf-8", errors="ignore").splitlines()
        except Exception:
            continue

        matches = [
            f"  Line {i + 1}: {line.strip()}"
            for i, line in enumerate(lines)
            if keyword_lower in line.lower()
        ]

        if matches:
            rel_path = file.relative_to(BASE_DIR)
            results.append(f"📄 {rel_path}:\n" + "\n".join(matches))

    if not results:
        return f"No files found containing '{keyword}'."

    return f"Found '{keyword}' in {len(results)} file(s):\n\n" + "\n\n".join(results)