from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings

from app.routers import llm_config
from app.routers import tool
from app.routers import agent
from app.routers import dashboard

# =========================================================
# App Factory
# =========================================================

def create_app() -> FastAPI:
    app = FastAPI(
        title="AI Workflow API",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # -----------------------------------------------------
    # CORS (tighten in production)
    # -----------------------------------------------------
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    #Register routers for LLM config module
    app.include_router(
        llm_config.router,
        prefix="/api/v1/llm-configs",
        tags=["LLM Configs"],
    )

    #Register routers for Tools module
    app.include_router(
        tool.router,
        prefix="/api/v1/tools",
        tags=["Tools"],
    )

    #Register routers for Agent module
    app.include_router(
        agent.router,
        prefix="/api/v1/agents",
        tags=["Agents"],
    )
    
    #Register routers for Dashboard
    app.include_router(
        dashboard.router,
        prefix="/api/v1/dashboard",
        tags=["Dashboard"],
    )
    
    return app


# Create application instance
app = create_app()