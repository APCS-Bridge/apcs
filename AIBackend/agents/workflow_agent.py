"""
Workflow Agent V0 - Agent pour gérer les workflows Kanban/Scrum
Utilise le MCP Server workflow_mcp pour accéder à la base de données
"""
import os
import sys
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.tools.mcp import MCPTools

from agents.settings import agent_settings
from agents.prompts import load_agent_prompts
from utils.log import logger


def get_workflow_agent(debug_mode: bool = True) -> Agent:
    """
    Créer et retourner le Workflow Agent
    
    Le Workflow Agent peut :
    - Récupérer des informations sur les workspaces
    - Lister et gérer le Product Backlog
    - Visualiser les boards Kanban
    - Créer et déplacer des tâches
    - Gérer les sprints (mode SCRUM)
    
    Args:
        debug_mode: Active les logs détaillés
    
    Returns:
        Agent Agno configuré avec les outils MCP
    """
    
    # Créer le toolkit MCP pour le serveur workflow
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
    # Ajouter les arguments : -m mcps.workflow_mcp
    mcp_tools.server_params.args = ["-m", "mcps.workflow_mcp"]
    
    # Charger les prompts du workflow agent depuis les fichiers Markdown
    workflow_prompts = load_agent_prompts('workflow')
    
    # Créer l'agent avec le modèle OpenAI GPT-4o-mini et les outils MCP
    agent = Agent(
        name="Workflow Agent",
        agent_id="workflow-agent-v0",
        model=OpenAIChat(
            id="gpt-5-mini",
        ),
        tools=[mcp_tools],  # Passer le toolkit MCP directement
        description=workflow_prompts['description'],
        instructions=workflow_prompts['instructions'],
        expected_output=workflow_prompts['expected_output'],
        markdown=True,
        debug_mode=debug_mode,
        show_tool_calls=False,  # Ne jamais montrer les appels d'outils à l'utilisateur
    )
    
    logger.info(f"✅ Workflow Agent créé avec MCPTools")
    
    return agent
