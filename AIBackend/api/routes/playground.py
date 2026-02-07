from agno.playground import Playground

from agents.workflow_agent import get_workflow_agent
from agents.scrum_master_agent import get_scrum_master_agent
from agents.administration_agent import get_administration_agent

######################################################
## Router for the Playground Interface
######################################################

# Instancier l'agent workflow (les outils MCP seront ajoutés au démarrage)
workflow_agent = get_workflow_agent(debug_mode=True)
scrum_master_agent = get_scrum_master_agent(debug_mode=True)
administration_agent = get_administration_agent(debug_mode=True)


# Create a playground instance
playground = Playground(
    agents=[workflow_agent, scrum_master_agent, administration_agent],
    teams=[],
)

playground_router = playground.get_async_router()
