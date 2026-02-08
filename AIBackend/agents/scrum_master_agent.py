"""
Scrum Master Agent - Agent pour gérer les sprints et la méthodologie Scrum
Utilise le MCP Server scrum_master_mcp pour accéder à la base de données
"""
import os
import sys

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.tools.mcp import MCPTools

from agents.settings import agent_settings
from agents.prompts import load_agent_prompts
from utils.log import logger


def get_scrum_master_agent(debug_mode: bool = True) -> Agent:
    """
    Créer et retourner le Scrum Master Agent
    
    Le Scrum Master Agent peut :
    - Créer et gérer des sprints
    - Planifier le Sprint Backlog
    - Démarrer et terminer des sprints
    - Suivre l'avancement du sprint (story points, vélocité)
    - Gérer les cérémonies Scrum
    
    Args:
        debug_mode: Active les logs détaillés
    
    Returns:
        Agent Agno configuré avec les outils MCP Scrum
    """
    
    # Créer le toolkit MCP pour le serveur scrum_master
    # Utiliser l'exécutable Python actuel pour lancer le MCP server
    # Cela fonctionne en local (venv) comme en Docker (system Python)
    
    # Passer les variables d'environnement nécessaires au subprocess MCP
    mcp_env = {
        "PYTHONPATH": ".",
        "DATABASE_URL": os.environ.get("DATABASE_URL", "postgresql://microhack:securepassword@postgres:5432/collaboration_platform"),
    }
    
    mcp_tools = MCPTools(
        command=sys.executable,  # Utiliser le Python actuel
        env=mcp_env,
        transport="stdio",
    )
    # Ajouter les arguments : -m mcps.scrum_master_mcp
    mcp_tools.server_params.args = ["-m", "mcps.scrum_master_mcp"]
    
    # Charger les prompts du scrum master agent depuis les fichiers Markdown
    scrum_master_prompts = load_agent_prompts('scrum_master')
    
    # Créer l'agent avec le modèle OpenAI GPT-4o-mini et les outils MCP
    agent = Agent(
        name="Scrum Master Agent",
        agent_id="scrum-master-agent-v0",
        model=OpenAIChat(
            id="gpt-5-mini",
        ),
        tools=[mcp_tools],  # Passer le toolkit MCP directement
        description=scrum_master_prompts['description'],
        instructions=scrum_master_prompts['instructions'],
        expected_output=scrum_master_prompts['expected_output'],
        markdown=True,
        debug_mode=debug_mode,
        show_tool_calls=False,  # Ne jamais montrer les appels d'outils à l'utilisateur
    )
    
    logger.info(f"✅ Scrum Master Agent créé : {agent.name} (ID: {agent.agent_id})")
    return agent
