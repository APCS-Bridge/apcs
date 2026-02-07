"""
MCP Server pour le Workflow Agent - Gestion Kanban/Scrum
Expose des outils pour manipuler les backlogs, tasks et colonnes.
Supporte les deux méthodologies : KANBAN et SCRUM.
Utilise des requêtes SQL directes à la base de données PostgreSQL.
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
logger = logging.getLogger("workflow_mcp")

from mcp.server import Server
from mcp.types import Tool, TextContent

from db.connection import db
from db.tables import (
    BacklogItem,
    Task,
    Column,
)
from db.tables.space import Space
from db.tables.sprint import Sprint


# Créer le serveur MCP
workflow_mcp = Server("workflow-mcp")


# ═══════════════════════════════════════════════════════════════
# 📋 OUTILS KANBAN/SCRUM (BACKLOG, TASKS, COLONNES)
# ═══════════════════════════════════════════════════════════════

@workflow_mcp.list_tools()
async def list_workflow_tools() -> list[Tool]:
    """Liste tous les outils disponibles pour le Workflow Agent"""
    return [
        # Outil intelligent qui détecte la méthodologie
        Tool(
            name="get_board",
            description="🎯 OUTIL PRINCIPAL - Récupérer le board de travail du workspace. Détecte automatiquement la méthodologie (KANBAN ou SCRUM) et retourne le board approprié. Pour SCRUM, retourne le board du sprint actif avec le sprint backlog. Pour KANBAN, retourne le board avec les colonnes et tâches. TOUJOURS utiliser cet outil quand l'utilisateur demande 'le board', 'le kanban', 'les tâches'.",
            inputSchema={
                "type": "object",
                "properties": {
                    "space_id": {"type": "string", "description": "ID du workspace (OBLIGATOIRE - utiliser le space_id du contexte utilisateur)"}
                },
                "required": ["space_id"]
            }
        ),
        Tool(
            name="get_space_info",
            description="Récupérer les informations d'un workspace (nom, méthodologie KANBAN/SCRUM, propriétaire). Utile pour savoir si le workspace est en mode KANBAN ou SCRUM.",
            inputSchema={
                "type": "object",
                "properties": {
                    "space_id": {"type": "string", "description": "ID du workspace (OBLIGATOIRE)"}
                },
                "required": ["space_id"]
            }
        ),
        # Product Backlog
        Tool(
            name="create_backlog_item",
            description="Créer un item dans le Product Backlog (user story). Utilise space_id et created_by_id du contexte utilisateur.",
            inputSchema={
                "type": "object",
                "properties": {
                    "space_id": {"type": "string", "description": "ID du workspace (OBLIGATOIRE - du contexte)"},
                    "title": {"type": "string", "description": "Titre de l'item"},
                    "created_by_id": {"type": "string", "description": "ID du créateur (OBLIGATOIRE - user_id du contexte)"},
                    "description": {"type": "string", "description": "Description détaillée"},
                    "assignee_id": {"type": "string", "description": "ID de l'assigné (optionnel)"}
                },
                "required": ["space_id", "title", "created_by_id"]
            }
        ),
        Tool(
            name="get_backlog",
            description="Récupérer le Product Backlog complet d'un workspace",
            inputSchema={
                "type": "object",
                "properties": {
                    "space_id": {"type": "string", "description": "ID du workspace (OBLIGATOIRE - du contexte)"}
                },
                "required": ["space_id"]
            }
        ),
        Tool(
            name="update_backlog_item",
            description="Mettre à jour un item du backlog",
            inputSchema={
                "type": "object",
                "properties": {
                    "item_id": {"type": "string", "description": "ID de l'item"},
                    "title": {"type": "string", "description": "Nouveau titre"},
                    "description": {"type": "string", "description": "Nouvelle description"},
                    "assignee_id": {"type": "string", "description": "Nouvel assigné"},
                    "position": {"type": "integer", "description": "Nouvelle position"}
                },
                "required": ["item_id"]
            }
        ),
        
        # Tasks
        Tool(
            name="create_task",
            description="Créer une nouvelle tâche liée à un item du backlog (KANBAN). Utilise sequence_number (ex: #4) ou backlog_item_id (CUID).",
            inputSchema={
                "type": "object",
                "properties": {
                    "space_id": {"type": "string", "description": "ID du workspace (requis pour résoudre le sequence_number)"},
                    "sequence_number": {"type": "integer", "description": "Numéro de l'item du backlog (ex: 4 pour #4)"},
                    "backlog_item_id": {"type": "string", "description": "ID CUID de l'item du backlog (alternatif à sequence_number)"},
                    "assignee_id": {"type": "string", "description": "ID de l'assigné (optionnel)"}
                },
                "required": ["space_id"]
            }
        ),
        Tool(
            name="move_task",
            description="Déplacer une tâche vers une colonne kanban (drag & drop)",
            inputSchema={
                "type": "object",
                "properties": {
                    "task_id": {"type": "string", "description": "ID de la tâche"},
                    "column_id": {"type": "string", "description": "ID de la colonne destination"},
                    "position": {"type": "integer", "description": "Position dans la colonne", "default": 0}
                },
                "required": ["task_id", "column_id"]
            }
        ),
        Tool(
            name="assign_task",
            description="Assigner une tâche à un utilisateur",
            inputSchema={
                "type": "object",
                "properties": {
                    "task_id": {"type": "string", "description": "ID de la tâche"},
                    "assignee_id": {"type": "string", "description": "ID de l'utilisateur"}
                },
                "required": ["task_id", "assignee_id"]
            }
        ),
        
        # Colonnes Kanban
        Tool(
            name="create_column",
            description="Créer une colonne kanban pour un workspace (KANBAN mode uniquement).",
            inputSchema={
                "type": "object",
                "properties": {
                    "space_id": {"type": "string", "description": "ID du workspace (OBLIGATOIRE - du contexte)"},
                    "name": {"type": "string", "description": "Nom de la colonne"},
                    "position": {"type": "integer", "description": "Position de la colonne"},
                    "wip_limit": {"type": "integer", "description": "Limite WIP (Work In Progress)"}
                },
                "required": ["space_id", "name"]
            }
        ),
        Tool(
            name="get_kanban_board",
            description="⚠️ DEPRECATED - Utiliser get_board à la place. Récupérer le board kanban d'un workspace KANBAN uniquement.",
            inputSchema={
                "type": "object",
                "properties": {
                    "space_id": {"type": "string", "description": "ID du workspace (OBLIGATOIRE)"}
                },
                "required": ["space_id"]
            }
        ),
        Tool(
            name="get_column_tasks",
            description="Récupérer toutes les tâches d'une colonne",
            inputSchema={
                "type": "object",
                "properties": {
                    "column_id": {"type": "string", "description": "ID de la colonne"}
                },
                "required": ["column_id"]
            }
        ),
    ]


# ═══════════════════════════════════════════════════════════════
# 🛠️ IMPLÉMENTATION DES OUTILS
# ═══════════════════════════════════════════════════════════════

@workflow_mcp.call_tool()
async def call_workflow_tool(name: str, arguments: dict[str, Any]) -> list[TextContent]:
    """Exécuter un outil du workflow"""
    
    await db.connect()  # S'assurer que la connexion est active
    
    try:
        # ─── Outil intelligent get_board ─────────────────────────────
        if name == "get_board":
            space_id = arguments.get("space_id")
            if not space_id:
                return [TextContent(type="text", text="❌ Erreur: space_id est obligatoire. Utilise le space_id du contexte utilisateur.")]
            
            # Récupérer les infos du workspace pour connaître la méthodologie
            space = await Space.find_by_id(space_id)
            if not space:
                return [TextContent(type="text", text=f"❌ Workspace '{space_id}' introuvable")]
            
            methodology = space.methodology
            result = f"📊 **Board - {space.name}** (Méthodologie: {methodology})\n\n"
            
            if methodology == "SCRUM":
                # Mode SCRUM: récupérer le sprint actif et son board
                active_sprint = await Sprint.get_active(space_id)
                
                if not active_sprint:
                    # Pas de sprint actif - afficher le product backlog
                    items = await BacklogItem.get_by_space(space_id)
                    result += "⚠️ **Aucun sprint actif** - Voici le Product Backlog:\n\n"
                    if items:
                        result += f"📋 Product Backlog ({len(items)} items):\n"
                        for item in items[:10]:
                            assignee = f" → {item['assignee_name']}" if item.get('assignee_name') else ""
                            result += f"  • #{item['sequence_number']}: {item['title']}{assignee}\n"
                        if len(items) > 10:
                            result += f"  ... et {len(items) - 10} autres items\n"
                    else:
                        result += "📋 Product Backlog vide\n"
                    result += "\n💡 Crée un sprint avec le Scrum Master pour commencer à travailler."
                else:
                    # Sprint actif trouvé - afficher son board
                    result += f"🏃 **Sprint actif**: {active_sprint.name}"
                    if active_sprint.goal:
                        result += f"\n📎 Objectif: {active_sprint.goal}"
                    result += f"\n📅 Du {active_sprint.start_date} au {active_sprint.end_date}\n\n"
                    
                    # Récupérer le board du sprint
                    board = await Task.get_sprint_board(active_sprint.id)
                    
                    if board:
                        for column_name, data in board.items():
                            wip = f" (WIP: {data['column']['wip_limit']})" if data['column'].get('wip_limit') else ""
                            result += f"🔹 **{column_name}**{wip} ({len(data['tasks'])} tâches)\n"
                            for task in data['tasks'][:5]:
                                points = f" [{task.get('story_points', '?')} pts]" if task.get('story_points') else ""
                                result += f"  • #{task['sequence_number']}: {task['title']}{points}\n"
                            if len(data['tasks']) > 5:
                                result += f"  ... et {len(data['tasks']) - 5} autres\n"
                            result += "\n"
                    else:
                        result += "📋 Board du sprint vide - Ajoute des items au Sprint Backlog.\n"
                    
                    # Ajouter un résumé du Sprint Backlog
                    sprint_items = await active_sprint.get_backlog_items()
                    if sprint_items:
                        total_points = sum(item.get('story_points', 0) or 0 for item in sprint_items)
                        result += f"\n📊 Sprint Backlog: {len(sprint_items)} items, {total_points} story points"
            
            else:
                # Mode KANBAN: board classique avec colonnes
                board = await Task.get_kanban_board(space_id)
                
                if not board:
                    result += "📋 Board Kanban vide - Aucune colonne configurée.\n"
                    result += "💡 Crée des colonnes (To Do, In Progress, Done) pour commencer."
                else:
                    for column_name, data in board.items():
                        wip = f" (WIP: {data['column']['wip_limit']})" if data['column'].get('wip_limit') else ""
                        result += f"🔹 **{column_name}**{wip} ({len(data['tasks'])} tâches)\n"
                        for task in data['tasks'][:5]:
                            result += f"  • #{task['sequence_number']}: {task['title']}\n"
                        if len(data['tasks']) > 5:
                            result += f"  ... et {len(data['tasks']) - 5} autres\n"
                        result += "\n"
                
                # Afficher aussi le product backlog pour KANBAN
                items = await BacklogItem.get_by_space(space_id)
                if items:
                    result += f"\n📋 Product Backlog ({len(items)} items disponibles)"
            
            return [TextContent(type="text", text=result)]
        
        elif name == "get_space_info":
            space_id = arguments.get("space_id")
            if not space_id:
                return [TextContent(type="text", text="❌ Erreur: space_id est obligatoire")]
            
            space = await Space.find_by_id(space_id)
            if not space:
                return [TextContent(type="text", text=f"❌ Workspace '{space_id}' introuvable")]
            
            result = f"📁 **Workspace: {space.name}**\n"
            result += f"  • ID: {space.id}\n"
            result += f"  • Méthodologie: {space.methodology}\n"
            result += f"  • Propriétaire: {space.owner_id}\n"
            
            if space.methodology == "SCRUM":
                active_sprint = await Sprint.get_active(space_id)
                if active_sprint:
                    result += f"  • Sprint actif: {active_sprint.name} (status: {active_sprint.status})\n"
                else:
                    result += "  • Aucun sprint actif\n"
            
            return [TextContent(type="text", text=result)]
        
        # ─── Product Backlog ─────────────────────────────────────────
        elif name == "create_backlog_item":
            space_id = arguments.get("space_id")
            created_by_id = arguments.get("created_by_id")
            
            if not space_id:
                return [TextContent(type="text", text="❌ Erreur: space_id est obligatoire. Utilise le space_id du contexte utilisateur.")]
            
            if not created_by_id:
                # Si created_by_id n'est pas fourni, utiliser le propriétaire du workspace
                space = await Space.find_by_id(space_id)
                if space:
                    created_by_id = space.owner_id
                    logger.info(f"✅ created_by_id récupéré du propriétaire du workspace: {created_by_id}")
                else:
                    return [TextContent(type="text", text=f"❌ Workspace '{space_id}' introuvable")]

            item_id = await BacklogItem.create(
                space_id=space_id,
                title=arguments["title"],
                created_by_id=created_by_id,
                description=arguments.get("description"),
                assignee_id=arguments.get("assignee_id")
            )
            item = await BacklogItem.find_by_id(item_id)
            return [TextContent(
                type="text",
                text=f"✅ Item créé dans le Product Backlog : #{item.sequence_number} - {item.title} (workspace: {space_id})"
            )]
        
        elif name == "get_backlog":
            space_id = arguments.get("space_id")
            if not space_id:
                return [TextContent(type="text", text="❌ Erreur: space_id est obligatoire")]

            items = await BacklogItem.get_by_space(space_id)
            if not items:
                return [TextContent(type="text", text="📋 Product Backlog vide")]

            result = f"📋 Product Backlog ({len(items)} items):\n\n"
            for item in items:
                assignee = f" → {item['assignee_name']}" if item.get('assignee_name') else ""
                result += f"#{item['sequence_number']} - {item['title']}{assignee}\n"
            return [TextContent(type="text", text=result)]

        elif name == "update_backlog_item":
            item = await BacklogItem.find_by_id(arguments["item_id"])
            if not item:
                return [TextContent(type="text", text="❌ Item introuvable")]

            updates = {k: v for k, v in arguments.items() if k != "item_id" and v is not None}
            await item.update(**updates)
            return [TextContent(type="text", text=f"✅ Item #{item.sequence_number} mis à jour")]
        
        # ─── Tasks ───────────────────────────────────────────────────
        elif name == "create_task":
            space_id = arguments.get("space_id")
            if not space_id:
                return [TextContent(type="text", text="❌ Erreur: space_id est obligatoire")]
            
            # Résoudre le backlog_item_id
            backlog_item_id = arguments.get("backlog_item_id")
            sequence_number = arguments.get("sequence_number")
            
            if not backlog_item_id and not sequence_number:
                return [TextContent(type="text", text="❌ Erreur: sequence_number ou backlog_item_id requis")]
            
            # Si sequence_number fourni, résoudre en backlog_item_id
            if sequence_number and not backlog_item_id:
                item = await BacklogItem.find_by_sequence(space_id, sequence_number)
                if not item:
                    return [TextContent(type="text", text=f"❌ Item #{sequence_number} introuvable dans ce workspace")]
                backlog_item_id = item.id
            
            # Vérifier que l'item existe
            if backlog_item_id:
                item = await BacklogItem.find_by_id(backlog_item_id)
                if not item:
                    return [TextContent(type="text", text=f"❌ Item {backlog_item_id} introuvable")]
            
            task_id = await Task.create(
                backlog_item_id=backlog_item_id,
                assignee_id=arguments.get("assignee_id")
            )
            
            # Placer la tâche dans la première colonne "To Do"
            first_column = await Column.get_first_column_for_space(space_id)
            if first_column:
                task = await Task.find_by_id(task_id)
                await task.move_to_column(first_column['id'])
            
            return [TextContent(type="text", text=f"✅ Tâche créée pour #{item.sequence_number} - {item.title} (ID: {task_id})")]

        elif name == "move_task":
            task = await Task.find_by_id(arguments["task_id"])
            if not task:
                return [TextContent(type="text", text="❌ Tâche introuvable")]

            await task.move_to_column(
                column_id=arguments["column_id"],
                position=arguments.get("position", 0)
            )
            return [TextContent(type="text", text=f"✅ Tâche déplacée vers la colonne {arguments['column_id']}")]

        elif name == "assign_task":
            task = await Task.find_by_id(arguments["task_id"])
            if not task:
                return [TextContent(type="text", text="❌ Tâche introuvable")]

            await task.assign(arguments["assignee_id"])
            return [TextContent(type="text", text=f"✅ Tâche assignée à {arguments['assignee_id']}")]

        # ─── Colonnes ────────────────────────────────────────────────
        elif name == "create_column":
            space_id = arguments.get("space_id")
            if not space_id:
                return [TextContent(type="text", text="❌ Erreur: space_id est obligatoire")]

            column_id = await Column.create_for_space(
                space_id=space_id,
                name=arguments["name"],
                position=arguments.get("position", 0),
                wip_limit=arguments.get("wip_limit")
            )

            return [TextContent(type="text", text=f"✅ Colonne '{arguments['name']}' créée (ID: {column_id}) dans workspace {space_id}")]

        elif name == "get_kanban_board":
            space_id = arguments.get("space_id")
            if not space_id:
                return [TextContent(type="text", text="❌ Erreur: space_id est obligatoire. Utilise get_board avec le space_id du contexte.")]

            board = await Task.get_kanban_board(space_id)

            result = "📊 Board Kanban:\n\n"
            for column_name, data in board.items():
                wip = f" (WIP: {data['column']['wip_limit']})" if data['column'].get('wip_limit') else ""
                result += f"🔹 {column_name}{wip} ({len(data['tasks'])} tâches)\n"
                for task in data['tasks'][:5]:  # Limiter à 5 pour lisibilité
                    result += f"  - #{task['sequence_number']}: {task['title']}\n"
                if len(data['tasks']) > 5:
                    result += f"  ... et {len(data['tasks']) - 5} autres\n"
                result += "\n"

            return [TextContent(type="text", text=result)]

        elif name == "get_column_tasks":
            column = await Column.find_by_id(arguments["column_id"])
            if not column:
                return [TextContent(type="text", text="❌ Colonne introuvable")]

            tasks = await column.get_tasks()
            result = f"📋 Colonne '{column.name}' ({len(tasks)} tâches):\n\n"
            for task in tasks:
                result += f"- #{task['sequence_number']}: {task['title']}\n"
            return [TextContent(type="text", text=result or "Aucune tâche")]

        else:
            return [TextContent(type="text", text=f"❌ Outil inconnu : {name}")]
            
    except Exception as e:
        logger.error(f"Erreur dans l'outil {name}: {e}")
        import traceback
        traceback.print_exc()
        return [TextContent(type="text", text=f"❌ Erreur : {str(e)}")]


# ═══════════════════════════════════════════════════════════════
# 🚀 DÉMARRAGE DU SERVEUR MCP
# ═══════════════════════════════════════════════════════════════

async def start_workflow_mcp():
    """Démarrer le serveur MCP pour le workflow"""
    from mcp.server.stdio import stdio_server
    
    logger.info("🚀 Démarrage du Workflow MCP Server...")
    # Ne pas se connecter ici - la connexion se fait dans call_workflow_tool() si nécessaire
    
    async with stdio_server() as (read_stream, write_stream):
        await workflow_mcp.run(
            read_stream,
            write_stream,
            workflow_mcp.create_initialization_options()
        )


if __name__ == "__main__":
    import asyncio
    import sys
    
    # Sur Windows, utiliser SelectorEventLoop pour la compatibilité avec psycopg
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(start_workflow_mcp())
