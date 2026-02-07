from fastapi import APIRouter

# from api.routes.playground import playground_router  # Temporairement désactivé - utiliser WebSocket à la place
from api.routes.status import status_router
from api.routes.context import context_router
from api.routes.agents import agents_router

v1_router = APIRouter(prefix="/v1")
v1_router.include_router(status_router)
# v1_router.include_router(playground_router)  # Temporairement désactivé
v1_router.include_router(context_router)
v1_router.include_router(agents_router)
