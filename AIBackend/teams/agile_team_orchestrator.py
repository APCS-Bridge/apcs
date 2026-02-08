"""
Agile Team Orchestrator - Team d'agents spécialisés en méthodologies agiles
Contient 3 agents membres :
- Workflow Agent : Gestion Kanban/Scrum, backlogs, tâches
- Scrum Master Agent : Cérémonies, sprints, réunions  
- Administration Agent : Gestion utilisateurs, espaces, membres

Le leader de l'équipe route automatiquement les requêtes vers le bon expert.
"""
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.team import Team

from agents.settings import agent_settings
from agents.workflow_agent import get_workflow_agent
from agents.scrum_master_agent import get_scrum_master_agent
from agents.administration_agent import get_administration_agent
from agents.prompts import load_agent_prompts
from utils.log import logger


def get_agile_team_orchestrator(debug_mode: bool = False) -> Team:
    """
    Créer et retourner l'Agile Team Orchestrator
    
    Team structure:
    - Leader: Orchestrateur qui analyse l'intention et route vers le bon agent
    - Membres:
      * Workflow Agent (Kanban, Backlog, Tâches)
      * Scrum Master Agent (Sprints, Cérémonies, Réunions)
      * Administration Agent (Users, Spaces, Membres)
    
    Args:
        debug_mode: Active les logs détaillés
    
    Returns:
        Team Agno avec 3 agents membres + 1 orchestrateur leader
    """
    
    # Créer les 3 agents membres (spécialistes)
    workflow_agent = get_workflow_agent(debug_mode=debug_mode)
    scrum_master_agent = get_scrum_master_agent(debug_mode=debug_mode)
    administration_agent = get_administration_agent(debug_mode=debug_mode)
    
    # Charger les prompts de l'orchestrateur depuis les fichiers Markdown
    orchestrator_prompts = load_agent_prompts('orchestrator')
    
    # Créer l'agent orchestrateur (leader de l'équipe)
    # Le leader a accès aux fonctions de transfert vers les membres
    orchestrator_leader = Agent(
        name="Orchestrator",
        agent_id="orchestrator-leader-v0",
        model=OpenAIChat(
            id="gpt-5-mini",
        ),
        description=orchestrator_prompts['description'],
        instructions=orchestrator_prompts['instructions'],
        expected_output=orchestrator_prompts['expected_output'],
        show_tool_calls=False,  # NE JAMAIS montrer les appels d'outils à l'utilisateur
        markdown=True,
        debug_mode=debug_mode,
    )
    
    # Créer la Team avec members
    # Mode "route" : Le premier agent (orchestrator) reçoit les messages et route vers les autres
    agile_team = Team(
        name="Agile Team Orchestrator",
        members=[
            orchestrator_leader,    # Premier = routeur/leader
            workflow_agent,
            scrum_master_agent,
            administration_agent
        ],
        mode="route",
        show_tool_calls=False,  # NE JAMAIS montrer les appels d'outils
        debug_mode=debug_mode,
    )
    
    logger.info(f"✅ Agile Team Orchestrator créée avec {len(agile_team.members)} agents (1 routeur + 3 spécialistes)")
    
    return agile_team
