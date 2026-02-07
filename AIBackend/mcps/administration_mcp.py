"""
MCP Server pour l'Administration - Gestion des Workspaces
Expose des outils pour créer et gérer les espaces de travail (KANBAN ou SCRUM).
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
logger = logging.getLogger("administration_mcp")

from mcp.server import Server
from mcp.types import Tool, TextContent

from db.connection import db
from db.tables import Space


# Créer le serveur MCP
administration_mcp = Server("administration-mcp")


# ═══════════════════════════════════════════════════════════════
# 🏢 OUTILS ADMINISTRATION (WORKSPACES)
# ═══════════════════════════════════════════════════════════════

@administration_mcp.list_tools()
async def list_administration_tools() -> list[Tool]:
    """Liste tous les outils disponibles pour l'Administration"""
    return [
        Tool(
            name="create_space",
            description="Créer un nouveau workspace (KANBAN ou SCRUM)",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Nom du workspace"},
                    "owner_id": {"type": "string", "description": "ID du propriétaire"},
                    "methodology": {
                        "type": "string",
                        "enum": ["KANBAN", "SCRUM"],
                        "description": "Méthodologie (KANBAN ou SCRUM)",
                        "default": "KANBAN"
                    }
                },
                "required": ["name", "owner_id"]
            }
        ),
        Tool(
            name="get_user_spaces",
            description="Récupérer tous les workspaces d'un utilisateur",
            inputSchema={
                "type": "object",
                "properties": {
                    "user_id": {"type": "string", "description": "ID de l'utilisateur"}
                },
                "required": ["user_id"]
            }
        ),
        Tool(
            name="get_space_info",
            description="Récupérer les informations complètes d'un workspace",
            inputSchema={
                "type": "object",
                "properties": {
                    "space_id": {"type": "string", "description": "ID du workspace"}
                },
                "required": ["space_id"]
            }
        ),
    ]


# ═══════════════════════════════════════════════════════════════
# 🛠️ IMPLÉMENTATION DES OUTILS
# ═══════════════════════════════════════════════════════════════

@administration_mcp.call_tool()
async def call_administration_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    """Exécuter un outil d'administration"""
    
    await db.connect()  # S'assurer que la connexion est active
    
    try:
        # ─── Spaces ──────────────────────────────────────────────────
        if name == "create_space":
            space_id = await Space.create(
                name=arguments["name"],
                owner_id=arguments["owner_id"],
                methodology=arguments.get("methodology", "KANBAN")
            )
            space = await Space.find_by_id(space_id)
            return [TextContent(
                type="text",
                text=f"✅ Workspace créé : {space.name} (ID: {space_id}, méthodologie: {space.methodology})"
            )]
        
        elif name == "get_user_spaces":
            spaces = await Space.get_by_user(arguments["user_id"])
            if not spaces:
                return [TextContent(type="text", text="Aucun workspace trouvé pour cet utilisateur")]
            
            result = f"📁 {len(spaces)} workspace(s) trouvé(s):\n\n"
            for space in spaces:
                result += f"- {space.name} ({space.methodology}) - ID: {space.id}\n"
            return [TextContent(type="text", text=result)]
        
        elif name == "get_space_info":
            space = await Space.find_by_id(arguments["space_id"])
            if not space:
                return [TextContent(type="text", text="❌ Workspace introuvable")]
            
            members = await space.get_members()
            result = f"🏢 {space.name}\n"
            result += f"Méthodologie: {space.methodology}\n"
            result += f"Propriétaire: {space.owner_id}\n"
            result += f"Membres: {len(members)}\n"
            return [TextContent(type="text", text=result)]
        
        else:
            return [TextContent(type="text", text=f"❌ Outil inconnu : {name}")]
            
    except Exception as e:
        logger.error(f"Erreur dans l'outil {name}: {e}")
        return [TextContent(type="text", text=f"❌ Erreur : {str(e)}")]


# ═══════════════════════════════════════════════════════════════
# 🚀 DÉMARRAGE DU SERVEUR MCP
# ═══════════════════════════════════════════════════════════════

async def start_administration_mcp():
    """Démarrer le serveur MCP pour l'administration"""
    from mcp.server.stdio import stdio_server
    
    logger.info("🚀 Démarrage du Administration MCP Server...")
    # Ne pas se connecter ici - la connexion se fait dans call_administration_tool() si nécessaire
    
    async with stdio_server() as (read_stream, write_stream):
        await administration_mcp.run(
            read_stream,
            write_stream,
            administration_mcp.create_initialization_options()
        )


if __name__ == "__main__":
    import asyncio
    import sys
    
    # Sur Windows, utiliser SelectorEventLoop pour la compatibilité avec psycopg
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(start_administration_mcp())
