import httpx
from app.config import settings
from bs4 import BeautifulSoup

#Web search tool
async def web_search(query: str, max_results: int = 5) -> str:
    """
    Search the web for real-time information.

    Args:
        query: Search query string
        max_results: Number of results to return

    Returns:
        Concatenated search results
    """

    if not query.strip():
        return "Search query is empty."

    url = "https://api.tavily.com/search"

    payload = {
        "api_key": settings.TAVILY_API_KEY,
        "query": query,
        "max_results": max_results,
    }

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

    except Exception as e:
        return f"Web search failed: {str(e)}"

    results = data.get("results", [])

    if not results:
        return "No results found."

    formatted = []

    for r in results:
        title = r.get("title", "No title")
        content = r.get("content", "")
        url = r.get("url", "")

        formatted.append(f"{title}\n{content}\nSource: {url}")

    return "\n\n".join(formatted)

async def web_tool(
    action: str,
    query: str = "",
    max_results: int = 5,
) -> str:
    """
    Unified web tool entry point.

    Args:
        action: Currently supports ["search"]
        query: Search query
        max_results: Number of results
    """

    if action == "search":
        return await web_search(query, max_results)

    return "Unknown web action."


