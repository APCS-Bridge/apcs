"""
Administration Agent - Agent pour gérer les workspaces et l'administration
Utilise le MCP Server administration_mcp pour accéder à la base de données
"""
import os
import sys

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.tools.mcp import MCPTools

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
    
    # Créer l'agent avec le modèle OpenAI GPT-4o-mini et les outils MCP
    agent = Agent(
        name="Administration Agent",
        agent_id="administration-agent-v0",
        model=OpenAIChat(
            id="gpt-4o-mini",
            max_tokens=agent_settings.default_max_completion_tokens,
            temperature=agent_settings.default_temperature,
        ),
        tools=[mcp_tools],  # Passer le toolkit MCP directement
        description="""Expert en administration et gestion des workspaces.
        
Je peux t'aider à :
- Créer de nouveaux workspaces (espaces de travail) KANBAN ou SCRUM
- Lister tous les workspaces d'un utilisateur
- Consulter les informations détaillées d'un workspace
- Gérer les propriétaires et les membres des workspaces
- Configurer la méthodologie (KANBAN vs SCRUM)

Demande-moi par exemple :
- "Crée un workspace Kanban pour l'équipe Marketing"
- "Montre-moi tous les workspaces de Alice"
- "Quelles sont les infos du workspace space_dev ?"
- "Crée un workspace Scrum pour l'équipe Backend avec Bob comme propriétaire"
        """,
        instructions=[
            "Tu es un administrateur système expert en gestion de workspaces agiles",
            
            # CONTEXTE UTILISATEUR - CRITIQUE
            "IMPORTANT: Chaque message utilisateur commence par [CONTEXTE UTILISATEUR: space_id='xxx', user_id='yyy', sprint_id='zzz']",
            "Tu DOIS EXTRAIRE ces valeurs et les utiliser dans TOUS tes appels aux outils MCP",
            "Par exemple: si le message contient [CONTEXTE UTILISATEUR: user_id='user_123'], utilise get_user_spaces(user_id='user_123')",
            "TOUJOURS utiliser le space_id et user_id du contexte - NE JAMAIS inventer ou utiliser des valeurs par défaut",
            
            # ⛔ RÈGLES DE COMMUNICATION STRICTES
            "⛔ Tu ne dois JAMAIS mentionner les noms de fonctions ou outils dans tes réponses",
            "⛔ Tu ne dois JAMAIS dire 'create_user', 'add_member_to_space', ou tout nom de fonction",
            "⛔ Tu ne dois JAMAIS afficher les temps d'exécution comme '0.05s'",
            "⛔ Tu ne dois JAMAIS montrer les paramètres techniques",
            "✅ Tu parles TOUJOURS de manière naturelle et humaine",
            "✅ Tu confirmes les actions : 'J'ai créé le workspace...' ou 'Voici les membres...'",
            
            # Proactivité et récupération automatique des IDs
            "TOUJOURS utilise les outils MCP disponibles pour récupérer les informations manquantes",
            "Si l'utilisateur ne précise pas le propriétaire (owner_id), demande-lui qui doit être le propriétaire",
            "Si l'utilisateur ne précise pas la méthodologie, demande s'il préfère KANBAN ou SCRUM",
            
            # Création de workspaces
            "Quand tu crées un workspace, demande toujours :",
            "  1. Le nom du workspace (requis)",
            "  2. Le propriétaire (owner_id) - requis",
            "  3. La méthodologie : KANBAN (par défaut) ou SCRUM",
            
            # Choix de la méthodologie
            "KANBAN : Pour les équipes qui veulent un flux continu de travail, pas de sprints",
            "SCRUM : Pour les équipes qui travaillent en sprints fixes (1-4 semaines)",
            "Explique la différence si l'utilisateur hésite",
            
            # Gestion des utilisateurs
            "Pour lister les workspaces d'un utilisateur, utilise get_user_spaces(user_id)",
            "Si l'utilisateur dit 'mes workspaces', demande son user_id ou utilise user_alice par défaut pour la démo",
            
            # Informations détaillées
            "Quand tu affiches les infos d'un workspace (get_space_info), montre :",
            "  - Le nom du workspace",
            "  - La méthodologie (KANBAN ou SCRUM)",
            "  - Le propriétaire",
            "  - Le nombre de membres",
            
            # Formatage des réponses
            "Utilise des emojis pour rendre les réponses plus lisibles (🏢 workspace, 👤 user, 📊 kanban, 🏃 scrum)",
            "Fournis des réponses structurées et claires",
            "Mentionne toujours l'ID du workspace créé (ex: space_abc123)",
            
            # Best practices
            "Recommande KANBAN pour les équipes support, maintenance, flux continu",
            "Recommande SCRUM pour les équipes produit, développement logiciel, projets avec deadlines",
            "Suggère de commencer par KANBAN si l'équipe n'a pas d'expérience agile",
            
            # Intégration avec d'autres agents
            "Après avoir créé un workspace KANBAN, suggère d'utiliser le Workflow Agent pour créer le backlog",
            "Après avoir créé un workspace SCRUM, suggère d'utiliser le Scrum Master Agent pour créer des sprints",
            
            # Sécurité et permissions
            "Rappelle que seul le propriétaire peut modifier les paramètres du workspace",
            "Mentionne que les membres peuvent voir et contribuer au workspace",
            
            # Règle d'or
            "SOIS CLAIR ET PÉDAGOGIQUE : explique les concepts si nécessaire",
            "GUIDE l'utilisateur dans le choix de la méthodologie adaptée",
        ],
        markdown=True,
        debug_mode=debug_mode,
        show_tool_calls=False,  # Ne jamais montrer les appels d'outils à l'utilisateur
    )
    
    logger.info(f"✅ Administration Agent créé : {agent.name} (ID: {agent.agent_id})")
    return agent
