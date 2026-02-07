"""
MCP Server pour le Scrum Master - Gestion des Sprints
Expose des outils pour gérer les sprints, sprint backlogs, et méthodologie SCRUM.
"""
import logging
import sys
import os
from typing import Any
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

# Configurer un logger simple pour MCP (pas de Rich car stdio)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stderr  # Logs sur stderr pour ne pas interférer avec stdio MCP
)
logger = logging.getLogger("scrum_master_mcp")

from mcp.server import Server
from mcp.types import Tool, TextContent

from db.connection import db
from db.tables import Sprint, SprintBacklogItem


# Créer le serveur MCP
scrum_master_mcp = Server("scrum-master-mcp")


# ═══════════════════════════════════════════════════════════════
# 🏃 OUTILS SCRUM (SPRINTS)
# ═══════════════════════════════════════════════════════════════

@scrum_master_mcp.list_tools()
async def list_scrum_tools() -> list[Tool]:
    """Liste tous les outils disponibles pour le Scrum Master"""
    return [
        Tool(
            name="create_sprint",
            description="Créer un nouveau sprint (SCRUM uniquement)",
            inputSchema={
                "type": "object",
                "properties": {
                    "space_id": {"type": "string", "description": "ID du workspace SCRUM"},
                    "name": {"type": "string", "description": "Nom du sprint"},
                    "start_date": {"type": "string", "format": "date", "description": "Date de début (YYYY-MM-DD)"},
                    "end_date": {"type": "string", "format": "date", "description": "Date de fin (YYYY-MM-DD)"},
                    "goal": {"type": "string", "description": "Objectif du sprint"}
                },
                "required": ["space_id", "name", "start_date", "end_date"]
            }
        ),
        Tool(
            name="add_to_sprint_backlog",
            description="Ajouter un item du Product Backlog au Sprint Backlog",
            inputSchema={
                "type": "object",
                "properties": {
                    "sprint_id": {"type": "string", "description": "ID du sprint"},
                    "backlog_item_id": {"type": "string", "description": "ID de l'item du Product Backlog"},
                    "story_points": {"type": "integer", "description": "Estimation en story points"},
                    "position": {"type": "integer", "description": "Position dans le sprint backlog"}
                },
                "required": ["sprint_id", "backlog_item_id"]
            }
        ),
        Tool(
            name="get_sprint_backlog",
            description="Récupérer le Sprint Backlog complet d'un sprint",
            inputSchema={
                "type": "object",
                "properties": {
                    "sprint_id": {"type": "string", "description": "ID du sprint"}
                },
                "required": ["sprint_id"]
            }
        ),
        Tool(
            name="start_sprint",
            description="Démarrer un sprint (changer status à ACTIVE)",
            inputSchema={
                "type": "object",
                "properties": {
                    "sprint_id": {"type": "string", "description": "ID du sprint"}
                },
                "required": ["sprint_id"]
            }
        ),
        Tool(
            name="complete_sprint",
            description="Terminer un sprint (changer status à COMPLETED)",
            inputSchema={
                "type": "object",
                "properties": {
                    "sprint_id": {"type": "string", "description": "ID du sprint"}
                },
                "required": ["sprint_id"]
            }
        ),
    ]


# ═══════════════════════════════════════════════════════════════
# 🛠️ IMPLÉMENTATION DES OUTILS
# ═══════════════════════════════════════════════════════════════

@scrum_master_mcp.call_tool()
async def call_scrum_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    """Exécuter un outil Scrum"""
    
    await db.connect()  # S'assurer que la connexion est active
    
    try:
        # ─── Sprints ─────────────────────────────────────────────────
        if name == "create_sprint":
            from datetime import datetime
            sprint_id = await Sprint.create(
                space_id=arguments["space_id"],
                name=arguments["name"],
                start_date=datetime.strptime(arguments["start_date"], "%Y-%m-%d").date(),
                end_date=datetime.strptime(arguments["end_date"], "%Y-%m-%d").date(),
                goal=arguments.get("goal"),
                status="PLANNING"
            )
            sprint = await Sprint.find_by_id(sprint_id)
            return [TextContent(
                type="text",
                text=f"✅ Sprint créé : {sprint.name} (ID: {sprint_id}, status: {sprint.status})"
            )]

        elif name == "add_to_sprint_backlog":
            # Vérifier si déjà dans le sprint
            exists = await SprintBacklogItem.is_in_sprint(
                arguments["sprint_id"],
                arguments["backlog_item_id"]
            )
            if exists:
                return [TextContent(type="text", text="❌ Cet item est déjà dans le sprint")]

            sbi_id = await SprintBacklogItem.add_to_sprint(
                sprint_id=arguments["sprint_id"],
                backlog_item_id=arguments["backlog_item_id"],
                story_points=arguments.get("story_points"),
                position=arguments.get("position", 0)
            )
            return [TextContent(
                type="text",
                text=f"✅ Item ajouté au Sprint Backlog (ID: {sbi_id})"
            )]

        elif name == "get_sprint_backlog":
            items = await SprintBacklogItem.get_by_sprint(arguments["sprint_id"])
            if not items:
                return [TextContent(type="text", text="📋 Sprint Backlog vide")]

            result = f"📋 Sprint Backlog ({len(items)} items):\n\n"
            for item in items:
                sp = f" ({item['story_points']} SP)" if item.get('story_points') else ""
                assignee = f" → {item['assignee_name']}" if item.get('assignee_name') else ""
                result += f"#{item['sequence_number']} - {item['title']}{sp}{assignee}\n"
            return [TextContent(type="text", text=result)]

        elif name == "start_sprint":
            sprint = await Sprint.find_by_id(arguments["sprint_id"])
            if not sprint:
                return [TextContent(type="text", text="❌ Sprint introuvable")]
            await sprint.update_status("ACTIVE")
            return [TextContent(type="text", text=f"✅ Sprint {sprint.name} démarré")]

        elif name == "complete_sprint":
            sprint = await Sprint.find_by_id(arguments["sprint_id"])
            if not sprint:
                return [TextContent(type="text", text="❌ Sprint introuvable")]
            await sprint.update_status("COMPLETED")
            return [TextContent(type="text", text=f"✅ Sprint {sprint.name} terminé")]

        else:
            return [TextContent(type="text", text=f"❌ Outil inconnu : {name}")]
            
    except Exception as e:
        logger.error(f"Erreur dans l'outil {name}: {e}")
        return [TextContent(type="text", text=f"❌ Erreur : {str(e)}")]


# ═══════════════════════════════════════════════════════════════
# 🚀 DÉMARRAGE DU SERVEUR MCP
# ═══════════════════════════════════════════════════════════════

async def start_scrum_master_mcp():
    """Démarrer le serveur MCP pour le Scrum Master"""
    from mcp.server.stdio import stdio_server
    
    logger.info("🚀 Démarrage du Scrum Master MCP Server...")
    # Ne pas se connecter ici - la connexion se fait dans call_scrum_tool() si nécessaire
    
    async with stdio_server() as (read_stream, write_stream):
        await scrum_master_mcp.run(
            read_stream,
            write_stream,
            scrum_master_mcp.create_initialization_options()
        )


if __name__ == "__main__":
    import asyncio
    import sys
    
    # Sur Windows, utiliser SelectorEventLoop pour la compatibilité avec psycopg
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(start_scrum_master_mcp())
