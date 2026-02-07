"""
Routes pour la communication avec les agents depuis le frontend
Endpoint custom pour recevoir les messages et router vers le bon agent
"""
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, AsyncGenerator
import json
import asyncio

from utils.log import logger

# Import des fonctions pour créer les agents en mode lazy
from agents.workflow_agent import get_workflow_agent
from agents.scrum_master_agent import get_scrum_master_agent
from agents.administration_agent import get_administration_agent
from teams.agile_team_orchestrator import get_agile_team_orchestrator


agents_router = APIRouter(prefix="/agents", tags=["Agents"])

# Dictionnaire des agents créés (lazy loading)
AGENTS = {}

# Tracker pour savoir quels agents ont été créés ET initialisés
_initialized_agents = set()


@agents_router.post("/reset-cache")
async def reset_agent_cache():
    """Vider le cache des agents pour forcer leur réinitialisation"""
    global AGENTS, _initialized_agents
    count = len(AGENTS)
    AGENTS.clear()
    _initialized_agents.clear()
    logger.info(f"[CACHE RESET] {count} agents supprimés du cache")
    return {"success": True, "message": f"{count} agents supprimés du cache", "status": "ready_for_reinitialization"}


async def ensure_agent_initialized(agent_id: str):
    """
    Créer et initialiser un agent à la demande (lazy loading)
    Cette fonction est appelée uniquement lors de la première utilisation
    """
    if agent_id in _initialized_agents:
        return  # Déjà créé et initialisé
    
    logger.info(f"[LAZY INIT] Création de l'agent '{agent_id}'...")
    
    try:
        # Créer la Team Orchestrator
        if agent_id == "orchestrator":
            logger.info(f"[LAZY CREATE] Initialisation de l'Agile Team Orchestrator...")
            team = get_agile_team_orchestrator(debug_mode=False)
            AGENTS[agent_id] = team
            logger.info(f"[LAZY CREATE] Agile Team créée avec {len(team.members)} agents (1 leader + 3 membres)")
            
            # Pour une Team, on initialise les MCPTools pour chaque agent membre
            for agent in team.members:
                if hasattr(agent, 'tools') and agent.tools:
                    for toolkit in agent.tools:
                        if hasattr(toolkit, 'connect'):
                            await toolkit.connect()
                            logger.info(f"[MCP] Toolkit connecté pour agent {agent.name}")
                        if hasattr(toolkit, 'initialize'):
                            await toolkit.initialize()
                            logger.info(f"[MCP] Toolkit initialisé pour agent {agent.name}")
            
            _initialized_agents.add(agent_id)
            logger.info(f"🎯 Agile Team Orchestrator '{agent_id}' prête !")
            return
        
        # Créer les agents individuels
        if agent_id == "workflow_agent":
            agent = get_workflow_agent(debug_mode=False)
        elif agent_id == "scrum_master_agent":
            agent = get_scrum_master_agent(debug_mode=False)
        elif agent_id == "administration_agent":
            agent = get_administration_agent(debug_mode=False)
        else:
            raise ValueError(f"Agent ID '{agent_id}' non reconnu")
        
        # Sauvegarder dans le dictionnaire
        AGENTS[agent_id] = agent
        logger.info(f"[LAZY CREATE] Agent {agent.name} créé")
        
        # Initialiser les MCP tools
        for toolkit in agent.tools:
            if hasattr(toolkit, 'connect'):
                await toolkit.connect()
                logger.info(f"[CONNECT] {agent.name}: MCP connecté")
            if hasattr(toolkit, 'initialize'):
                await toolkit.initialize()
                logger.info(f"[OK] {agent.name}: {len(toolkit.functions)} outils MCP initialisés")
        
        _initialized_agents.add(agent_id)
        logger.info(f"[LAZY INIT] Agent {agent.name} prêt!")
    
    except Exception as e:
        logger.error(f"[LAZY INIT] Erreur lors de l'initialisation de '{agent_id}': {e}")
        raise


class AgentMessageRequest(BaseModel):
    """Requête pour envoyer un message à un agent"""
    agent_id: str  # workflow_agent, scrum_master_agent, administration_agent
    message: str
    session_id: Optional[str] = None
    context: Optional[dict] = None  # {user_id, space_id, sprint_id}
    stream: bool = True


class AgentMessageResponse(BaseModel):
    """Réponse d'un agent (non-streaming)"""
    content: str
    session_id: str
    run_id: str


def build_message_with_context(message: str, context: Optional[dict] = None) -> str:
    """
    Injecte le contexte utilisateur dans le message pour que l'agent puisse l'utiliser.
    Le contexte contient space_id, user_id, sprint_id qui sont nécessaires pour les appels MCP.
    """
    if not context:
        return message
    
    context_parts = []
    if context.get("space_id"):
        context_parts.append(f"space_id='{context['space_id']}'")
    if context.get("user_id"):
        context_parts.append(f"user_id='{context['user_id']}'")
    if context.get("sprint_id"):
        context_parts.append(f"sprint_id='{context['sprint_id']}'")
    
    if not context_parts:
        return message
    
    context_str = ", ".join(context_parts)
    return f"[CONTEXTE UTILISATEUR: {context_str}]\n\n{message}"


async def stream_agent_response(agent, message: str, session_id: Optional[str], context: Optional[dict] = None) -> AsyncGenerator[str, None]:
    """
    Stream la réponse de l'agent en chunks SSE (Server-Sent Events)
    
    Format: data: {"content": "chunk de texte"}\n\n
    """
    try:
        # Enrichir le message avec le contexte utilisateur
        enriched_message = build_message_with_context(message, context)
        logger.info(f"[Agent] Message enrichi avec contexte: {enriched_message[:100]}...")
        
        # Appeler l'agent avec streaming (async)
        run_response = await agent.arun(enriched_message, session_id=session_id, stream=True)
        
        # Stream les chunks (async iteration)
        async for chunk in run_response:
            if hasattr(chunk, 'content') and chunk.content:
                # Format SSE
                data = json.dumps({"content": chunk.content})
                yield f"data: {data}\n\n"
        
        # Signal de fin
        yield "data: [DONE]\n\n"
        
    except Exception as e:
        logger.error(f"Erreur lors du streaming agent: {e}")
        error_data = json.dumps({"error": str(e)})
        yield f"data: {error_data}\n\n"


@agents_router.post("/message")
async def send_message_to_agent(request: AgentMessageRequest):
    """
    Envoyer un message à un agent et recevoir la réponse
    
    - Si stream=True: retourne un StreamingResponse (SSE)
    - Si stream=False: retourne la réponse complète
    """
    logger.info(f"[/message] Requête reçue pour agent_id={request.agent_id}")
    
    # Initialiser l'agent en mode lazy si nécessaire
    try:
        await ensure_agent_initialized(request.agent_id)
        logger.info(f"[/message] Agent {request.agent_id} initialisé avec succès")
    except ValueError as e:
        logger.error(f"[/message] ValueError: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"[/message] Erreur inattendue lors de l'initialisation: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'initialisation: {str(e)}")
    
    # Récupérer l'agent (maintenant créé)
    agent = AGENTS.get(request.agent_id)
    logger.info(f"[/message] AGENTS dict = {list(AGENTS.keys())}, agent={agent}")
    
    if not agent:
        raise HTTPException(
            status_code=404,
            detail=f"Agent '{request.agent_id}' introuvable après initialisation. Agents disponibles: {list(AGENTS.keys())}"
        )
    
    logger.info(f"[Agent] Message reçu pour {request.agent_id}: {request.message[:50]}...")
    logger.info(f"[Agent] Context: {request.context}")
    
    # Mode streaming
    if request.stream:
        return StreamingResponse(
            stream_agent_response(agent, request.message, request.session_id, request.context),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # Nginx buffering désactivé
            }
        )
    
    # Mode non-streaming (réponse complète)
    else:
        # Enrichir le message avec le contexte utilisateur
        enriched_message = build_message_with_context(request.message, request.context)
        logger.info(f"[Agent] Message enrichi avec contexte: {enriched_message[:100]}...")
        
        run_response = await agent.arun(enriched_message, session_id=request.session_id, stream=False)
        
        return AgentMessageResponse(
            content=run_response.content,
            session_id=run_response.session_id,
            run_id=run_response.run_id,
        )


@agents_router.get("/list")
async def list_agents():
    """Lister les agents disponibles"""
    return {
        "agents": [
            {
                "id": "orchestrator",
                "name": "Agile Team Orchestrator",
                "description": "🎯 Équipe intelligente qui analyse votre demande et la route vers l'expert approprié (Workflow, Scrum Master, ou Administration)"
            },
            {
                "id": "workflow_agent",
                "name": "Workflow Agent",
                "description": "Expert en gestion de workflows Kanban et Scrum"
            },
            {
                "id": "scrum_master_agent",
                "name": "Scrum Master Agent",
                "description": "Expert en méthodologie Scrum et gestion de sprints"
            },
            {
                "id": "administration_agent",
                "name": "Administration Agent",
                "description": "Gestion des workspaces et utilisateurs"
            }
        ]
    }


@agents_router.websocket("/ws/{agent_id}")
async def websocket_agent_endpoint(websocket: WebSocket, agent_id: str):
    """
    WebSocket endpoint pour communiquer avec un agent en temps réel
    
    Format des messages:
    - Client → Serveur: {"message": "...", "session_id": "...", "context": {...}}
    - Serveur → Client: {"type": "chunk", "content": "..."} ou {"type": "done"} ou {"type": "error", "message": "..."}
    """
    await websocket.accept()
    logger.info(f"[WebSocket] Client connecté pour l'agent: {agent_id}")
    
    try:
        # Vérifier que l'agent existe
        if agent_id not in AGENTS:
            await websocket.send_json({
                "type": "error",
                "message": f"Agent '{agent_id}' non trouvé. Agents disponibles: {list(AGENTS.keys())}"
            })
            await websocket.close()
            return
        
        # Initialiser l'agent à la demande (lazy loading)
        try:
            await ensure_agent_initialized(agent_id)
        except Exception as e:
            await websocket.send_json({
                "type": "error",
                "message": f"Erreur lors de l'initialisation de l'agent: {str(e)}"
            })
            await websocket.close()
            return
        
        agent = AGENTS[agent_id]
        
        # Boucle de réception de messages
        while True:
            # Recevoir le message du client
            data = await websocket.receive_json()
            message = data.get("message", "")
            session_id = data.get("session_id")
            context = data.get("context", {})
            
            logger.info(f"[WebSocket] Message reçu: {message[:50]}...")
            
            try:
                # Appeler l'agent avec streaming
                run_response = agent.run(message, session_id=session_id, stream=True)
                
                # Streamer les chunks via WebSocket
                for chunk in run_response:
                    if hasattr(chunk, 'content') and chunk.content:
                        await websocket.send_json({
                            "type": "chunk",
                            "content": chunk.content
                        })
                
                # Signal de fin
                await websocket.send_json({"type": "done"})
                
            except Exception as e:
                logger.error(f"[WebSocket] Erreur lors du traitement: {e}")
                await websocket.send_json({
                    "type": "error",
                    "message": str(e)
                })
    
    except WebSocketDisconnect:
        logger.info(f"[WebSocket] Client déconnecté de l'agent: {agent_id}")
    except Exception as e:
        logger.error(f"[WebSocket] Erreur inattendue: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e)
            })
        except:
            pass


@agents_router.websocket("/ws-test/{agent_id}")
async def websocket_test_endpoint(websocket: WebSocket, agent_id: str):
    """
    WebSocket endpoint de test (mock) qui ne nécessite pas de clé API Mistral
    Utile pour tester la connexion WebSocket sans appeler l'API
    """
    await websocket.accept()
    logger.info(f"[WebSocket Test] Client connecté pour test agent: {agent_id}")
    
    try:
        while True:
            # Recevoir le message du client
            data = await websocket.receive_json()
            message = data.get("message", "")
            session_id = data.get("session_id", "test-session")
            
            logger.info(f"[WebSocket Test] Message reçu: {message}")
            
            # Réponse mock
            mock_response = f"✅ WebSocket fonctionne!\n\n**Message reçu**: {message}\n**Agent**: {agent_id}\n**Session**: {session_id}\n\nLe backend communique correctement via WebSocket. Les MCP tools sont initialisés avec 17 outils."
            
            # Streamer en chunks
            for word in mock_response.split():
                await websocket.send_json({
                    "type": "chunk",
                    "content": word + " "
                })
                await asyncio.sleep(0.05)
            
            # Signal de fin
            await websocket.send_json({"type": "done"})
    
    except WebSocketDisconnect:
        logger.info(f"[WebSocket Test] Client déconnecté")
    except Exception as e:
        logger.error(f"[WebSocket Test] Erreur: {e}")


@agents_router.post("/test")
async def test_agent_communication(request: AgentMessageRequest):
    """
    Endpoint de test pour vérifier la communication frontend → backend
    Retourne une réponse mock sans appeler l'API Mistral
    """
    logger.info(f"[Test] Message reçu: {request.message}")
    
    # Réponse mock en streaming
    async def mock_stream():
        mock_response = f"✅ Message bien reçu par le backend!\n\n**Votre message**: {request.message}\n**Agent**: {request.agent_id}\n**Session**: {request.session_id or 'nouvelle session'}\n\nLe backend fonctionne correctement. Le problème est que la clé API Mistral est invalide (401 Unauthorized).\n\nPour résoudre:\n1. Va sur https://console.mistral.ai/api-keys/\n2. Crée une nouvelle clé API\n3. Remplace MISTRAL_API_KEY dans le fichier .env\n4. Redémarre le serveur"
        
        # Envoyer en chunks
        for word in mock_response.split():
            data = json.dumps({"content": word + " "})
            yield f"data: {data}\n\n"
            await asyncio.sleep(0.05)  # Simuler le streaming
        
        yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        mock_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
