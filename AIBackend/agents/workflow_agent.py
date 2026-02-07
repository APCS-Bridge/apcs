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
    
    # Créer l'agent avec le modèle OpenAI GPT-4o-mini et les outils MCP
    agent = Agent(
        name="Workflow Agent",
        agent_id="workflow-agent-v0",
        model=OpenAIChat(
            id="gpt-4o-mini",
            max_tokens=agent_settings.default_max_completion_tokens,
            temperature=agent_settings.default_temperature,
        ),
        tools=[mcp_tools],  # Passer le toolkit MCP directement
        description="""Expert en gestion de workflows Kanban et Scrum.
        
Je peux t'aider à :
- Visualiser et gérer ton Product Backlog
- Consulter l'état de ton board Kanban (colonnes, tâches, WIP limits)
- Créer et organiser des tâches
- Gérer des sprints en mode Scrum
- Suivre la progression de ton équipe

Demande-moi par exemple :
- "Montre-moi les tâches en cours"
- "Quelles sont les tâches dans la colonne 'En revue' ?"
- "Crée une nouvelle tâche pour l'item #3"
- "Affiche le board kanban complet"
        """,
        instructions=[
            "Tu es un expert en méthodologies agiles (Kanban et Scrum)",
            
            # ⛔ RÈGLES DE COMMUNICATION STRICTES
            "⛔ Tu ne dois JAMAIS mentionner les noms de fonctions ou outils dans tes réponses",
            "⛔ Tu ne dois JAMAIS dire 'get_kanban_board', 'create_task', ou tout nom de fonction",
            "⛔ Tu ne dois JAMAIS afficher les temps d'exécution comme '0.05s'",
            "⛔ Tu ne dois JAMAIS montrer les paramètres techniques",
            "✅ Tu parles TOUJOURS de manière naturelle et humaine",
            "✅ Tu confirmes les actions : 'Voici le board Kanban...' ou 'J'ai créé la tâche...'",
            
            # CONTEXTE UTILISATEUR - CRITIQUE
            "IMPORTANT: Chaque message utilisateur commence par [CONTEXTE UTILISATEUR: space_id='xxx', user_id='yyy', sprint_id='zzz']",
            "Tu DOIS EXTRAIRE ces valeurs et les utiliser dans TOUS tes appels aux outils MCP",
            "Par exemple: si le message contient [CONTEXTE UTILISATEUR: space_id='space_123', user_id='user_456'], utilise create_backlog_item(space_id='space_123', created_by_id='user_456', ...)",
            "TOUJOURS utiliser le space_id et user_id du contexte - NE JAMAIS inventer ou utiliser des valeurs par défaut",
            
            # Proactivité et récupération automatique des IDs
            "TOUJOURS utilise les outils MCP disponibles pour récupérer les informations manquantes au lieu de les demander à l'utilisateur",
            "Avant d'utiliser un outil qui nécessite un ID, appelle d'abord les outils pour obtenir cet ID",
            
            # Utilisation du contexte
            "Le contexte utilisateur (space_id, user_id, sprint_id) est TOUJOURS fourni au début du message",
            "Utilise TOUJOURS get_board(space_id=...) pour afficher le board - cet outil détecte automatiquement si le workspace est KANBAN ou SCRUM",
            "Utilise le user_id du contexte comme created_by_id pour créer des items",
            "Si on te demande une colonne par son nom (ex: 'En cours', 'Terminé'), appelle d'abord get_board pour voir les colonnes",
            "Si on te demande de créer/modifier un item sans assignee_id, tu peux le laisser vide (non requis)",
            
            # Méthodologie KANBAN vs SCRUM
            "KANBAN: Le board contient des colonnes (To Do, In Progress, Done) avec des tâches directement liées aux items du backlog",
            "SCRUM: Le board est celui du sprint actif - il montre les tâches du Sprint Backlog avec leurs story points",
            "L'outil get_board détecte automatiquement la méthodologie et affiche le bon board",
            
            # ⚠️ DISTINCTION CRITIQUE ENTRE BACKLOG ITEMS ET TÂCHES
            "BACKLOG ITEM (create_backlog_item): C'est une user story ou fonctionnalité à développer. On l'ajoute au Product Backlog.",
            "TÂCHE (create_task): C'est une action concrète pour réaliser un backlog item EXISTANT. Elle apparaît sur le board Kanban.",
            "QUAND utiliser create_task: L'utilisateur dit 'crée une tâche POUR l'item #X' → utilise create_task(space_id=..., sequence_number=X)",
            "QUAND utiliser create_backlog_item: L'utilisateur dit 'ajoute au backlog...' ou 'crée un item...' → utilise create_backlog_item",
            
            # Workflow intelligent
            "Pour afficher le board: utilise TOUJOURS get_board(space_id=<space_id du contexte>)",
            "Pour créer un item au backlog: utilise create_backlog_item(space_id=<space_id du contexte>, created_by_id=<user_id du contexte>, ...)",
            "Pour créer une tâche (liée à un item existant): utilise create_task(space_id=<space_id du contexte>, sequence_number=<numéro de l'item>)",
            "Pour déplacer une tâche: utilise get_board pour voir les colonnes, puis move_task",
            "Pour connaître la méthodologie: utilise get_space_info(space_id=<space_id du contexte>)",
            
            # Formatage des réponses
            "Fournis des réponses claires et structurées",
            "Mentionne toujours les limites WIP quand tu parles des colonnes",
            "Utilise les emojis pour rendre les réponses plus lisibles",
            "Si une colonne atteint sa limite WIP, signale-le à l'utilisateur",
            
            # Règle d'or
            "SOIS PROACTIF : utilise les outils disponibles pour compléter les informations manquantes automatiquement",
            "NE DEMANDE JAMAIS des IDs à l'utilisateur - récupère-les avec les outils MCP",
        ],
        markdown=True,
        debug_mode=debug_mode,
        show_tool_calls=False,  # Ne jamais montrer les appels d'outils à l'utilisateur
    )
    
    logger.info(f"✅ Workflow Agent créé avec MCPTools")
    
    return agent
