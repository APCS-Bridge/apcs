from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Charger les variables d'environnement depuis .env
load_dotenv()

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from api.routes.v1_router import v1_router
from api.settings import api_settings
from utils.log import logger

# Import des fonctions pour créer les agents (pas les instances)
from agents.workflow_agent import get_workflow_agent
from agents.scrum_master_agent import get_scrum_master_agent
from agents.administration_agent import get_administration_agent

# Les agents seront créés une seule fois au démarrage
workflow_agent = None
scrum_master_agent = None
administration_agent = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown"""
    # Startup: Ne PAS créer les agents ici, ils seront créés en mode lazy
    logger.info("[INIT] Mode lazy: les agents seront créés à la demande")
    
    yield
    
    # Shutdown: Fermer les agents si créés
    logger.info("[SHUTDOWN] Arret de l'application")


def create_app() -> FastAPI:
    """Create a FastAPI App"""

    # Create FastAPI App
    app: FastAPI = FastAPI(
        title=api_settings.title,
        version=api_settings.version,
        docs_url="/docs" if api_settings.docs_enabled else None,
        redoc_url="/redoc" if api_settings.docs_enabled else None,
        openapi_url="/openapi.json" if api_settings.docs_enabled else None,
        lifespan=lifespan,
    )

    # Add v1 router
    app.include_router(v1_router)

    # Add Middlewares
    app.add_middleware(
        CORSMiddleware,
        allow_origins=api_settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    return app


# Create FastAPI app
app = create_app()
