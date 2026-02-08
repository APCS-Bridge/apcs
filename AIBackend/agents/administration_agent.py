"""
Administration Agent - Agent pour gérer les workspaces et l'administration
Utilise le MCP Server administration_mcp pour accéder à la base de données
"""
import os
import sys

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.tools.mcp import MCPTools

from agents.prompts import load_agent_prompts
from agents.settings import agent_settings
from utils.log import logger


def get_administration_agent(debug_mode: bool = True) -> Agent:
    """
    Créer et retourner l'Administration Agent
    
    L'Administration Agent peut :
    - Créer des workspaces (KANBAN ou SCRUM)
    - Lister les workspaces d'un utilisateur
    - Consulter les informations d'un workspace (méthodologie, propriétaire, membres)
    - Gérer les permissions et les accès
    
    Args:
        debug_mode: Active les logs détaillés
    
    Returns:
        Agent Agno configuré avec les outils MCP Administration
    """
    
    # Créer le toolkit MCP pour le serveur administration
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
    # Ajouter les arguments : -m mcps.administration_mcp
    mcp_tools.server_params.args = ["-m", "mcps.administration_mcp"]
    
    # Charger les prompts depuis les fichiers Markdown
    administration_prompts = load_agent_prompts('administration')
    
    # Créer l'agent avec le modèle OpenAI GPT-4o-mini et les outils MCP
    agent = Agent(
        name="Administration Agent",
        agent_id="administration-agent-v0",
        model=OpenAIChat(
            id="gpt-5-mini",
        ),
        tools=[mcp_tools],  # Passer le toolkit MCP directement
        description=administration_prompts['description'],
        instructions=administration_prompts['instructions'],
        expected_output=administration_prompts['expected_output'],
        markdown=True,
        debug_mode=debug_mode,
        show_tool_calls=False,  # Ne jamais montrer les appels d'outils à l'utilisateur
    )
    
    logger.info(f"✅ Administration Agent créé : {agent.name} (ID: {agent.agent_id})")
    return agent
