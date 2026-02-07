"""
Routes pour récupérer le contexte utilisateur/workspace automatiquement
Ces endpoints permettent à l'agent de récupérer les IDs nécessaires sans les demander à l'utilisateur

Les données sont récupérées DIRECTEMENT depuis PostgreSQL (table sessions, spaces, users, columns)
⚠️ ENDPOINTS INTERNES - Utilisés par les MCP servers, pas d'authentification JWT requise
"""
from fastapi import APIRouter, HTTPException
from typing import Optional

from utils.log import logger
from db.connection import execute_query, execute_one


context_router = APIRouter(prefix="/context", tags=["Context"])


@context_router.get("/current-user")
async def get_current_user(user_id: Optional[str] = "user_alice"):
    """
    Récupérer l'utilisateur courant depuis la table sessions
    
    Args:
        user_id: ID de l'utilisateur (défaut: user_alice)
    
    Returns:
        {
            "user_id": "user_alice",
            "space_id": "space_dev",
            "sprint_id": null
        }
    """
    try:
        row = await execute_one(
            "SELECT user_id, space_id, sprint_id FROM sessions WHERE user_id = %s",
            (user_id,)
        )
        
        if not row:
            logger.warning(f"[Context] Aucune session trouvée pour {user_id}")
            return {"user_id": user_id, "space_id": None, "sprint_id": None}
        
        logger.info(f"[Context] Session trouvée: {user_id} → space={row['space_id']}, sprint={row['sprint_id']}")
        return {
            "user_id": row['user_id'],
            "space_id": row['space_id'],
            "sprint_id": row['sprint_id']
        }
    except Exception as e:
        logger.error(f"[Context] Erreur lors de la récupération de la session: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur base de données: {str(e)}")


@context_router.get("/default-workspace")
async def get_default_workspace(user_id: Optional[str] = "user_alice"):
    """
    Récupérer le workspace depuis la session de l'utilisateur
    
    Args:
        user_id: ID de l'utilisateur (défaut: user_alice)
    
    Returns:
        {
            "space_id": "space_dev",
            "name": "Development Space",
            "methodology": "KANBAN"
        }
    """
    try:
        # Récupérer le space_id depuis la session
        session = await execute_one(
            "SELECT space_id FROM sessions WHERE user_id = %s",
            (user_id,)
        )
        
        if not session or not session['space_id']:
            logger.warning(f"[Context] Aucun workspace dans la session de {user_id}, utilisation du premier disponible")
            # Récupérer le premier workspace disponible
            space = await execute_one(
                "SELECT id, name, methodology FROM spaces ORDER BY created_at ASC LIMIT 1"
            )
            if not space:
                raise HTTPException(status_code=404, detail="Aucun workspace disponible")
            
            logger.info(f"[Context] Premier workspace: {space['id']}")
            return {
                "space_id": space['id'],
                "name": space['name'],
                "methodology": space['methodology']
            }
        
        # Récupérer les infos du workspace
        space = await execute_one(
            "SELECT id, name, methodology FROM spaces WHERE id = %s",
            (session['space_id'],)
        )
        
        if not space:
            raise HTTPException(status_code=404, detail=f"Workspace {session['space_id']} introuvable")
        
        logger.info(f"[Context] Workspace de la session: {space['id']}")
        return {
            "space_id": space['id'],
            "name": space['name'],
            "methodology": space['methodology']
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Context] Erreur lors de la récupération du workspace: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur base de données: {str(e)}")


@context_router.get("/active-sprint")
async def get_active_sprint(user_id: Optional[str] = "user_alice"):
    """
    Récupérer le sprint actif depuis la session de l'utilisateur
    
    Args:
        user_id: ID de l'utilisateur (défaut: user_alice)
    
    Returns:
        {
            "sprint_id": "sprint_1",
            "name": "Sprint 1",
            "status": "ACTIVE"
        }
    """
    try:
        # Récupérer le sprint_id depuis la session
        session = await execute_one(
            "SELECT sprint_id FROM sessions WHERE user_id = %s",
            (user_id,)
        )
        
        if not session or not session['sprint_id']:
            logger.info(f"[Context] Aucun sprint actif pour {user_id}")
            return {
                "sprint_id": None,
                "name": None,
                "status": None,
                "start_date": None,
                "end_date": None
            }
        
        # Récupérer les infos du sprint
        sprint = await execute_one(
            "SELECT id, name, status, start_date, end_date FROM sprints WHERE id = %s",
            (session['sprint_id'],)
        )
        
        if not sprint:
            logger.warning(f"[Context] Sprint {session['sprint_id']} introuvable")
            return {
                "sprint_id": None,
                "name": None,
                "status": None,
                "start_date": None,
                "end_date": None
            }
        
        logger.info(f"[Context] Sprint actif: {sprint['id']} ({sprint['status']})")
        return {
            "sprint_id": sprint['id'],
            "name": sprint['name'],
            "status": sprint['status'],
            "start_date": sprint['start_date'].isoformat() if sprint['start_date'] else None,
            "end_date": sprint['end_date'].isoformat() if sprint['end_date'] else None
        }
    except Exception as e:
        logger.error(f"[Context] Erreur lors de la récupération du sprint: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur base de données: {str(e)}")


@context_router.get("/workspace-metadata")
async def get_workspace_metadata(user_id: Optional[str] = "user_alice"):
    """
    Récupérer les métadonnées du workspace de l'utilisateur
    
    Args:
        user_id: ID de l'utilisateur (défaut: user_alice)
    
    Returns:
        {
            "space_id": "space_dev",
            "name": "Development Space",
            "methodology": "KANBAN",
            "owner_id": "user_alice"
        }
    """
    try:
        # Récupérer le space_id depuis la session
        session = await execute_one(
            "SELECT space_id FROM sessions WHERE user_id = %s",
            (user_id,)
        )
        
        space_id = session['space_id'] if session and session['space_id'] else None
        
        if not space_id:
            # Récupérer le premier workspace
            first_space = await execute_one(
                "SELECT id FROM spaces ORDER BY created_at ASC LIMIT 1"
            )
            if not first_space:
                raise HTTPException(status_code=404, detail="Aucun workspace disponible")
            space_id = first_space['id']
        
        # Récupérer les métadonnées complètes
        space = await execute_one(
            "SELECT id, name, methodology, created_by_id FROM spaces WHERE id = %s",
            (space_id,)
        )
        
        if not space:
            raise HTTPException(status_code=404, detail=f"Workspace {space_id} introuvable")
        
        logger.info(f"[Context] Métadonnées workspace: {space['id']}")
        return {
            "space_id": space['id'],
            "name": space['name'],
            "methodology": space['methodology'],
            "owner_id": space['created_by_id']
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Context] Erreur lors de la récupération des métadonnées: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur base de données: {str(e)}")


@context_router.get("/available-users")
async def get_available_users(space_id: Optional[str] = None):
    """
    Récupérer la liste des utilisateurs disponibles
    
    Args:
        space_id: ID du workspace (optionnel, si fourni filtre par membres du workspace)
    
    Returns:
        [
            {"user_id": "user_alice", "name": "Alice Dupont", "email": "alice@example.com"},
            {"user_id": "user_bob", "name": "Bob Martin", "email": "bob@example.com"},
            ...
        ]
    """
    try:
        if space_id:
            # Récupérer les membres du workspace
            rows = await execute_query(
                """
                SELECT u.id, u.name, u.email 
                FROM users u
                INNER JOIN space_members sm ON u.id = sm.user_id
                WHERE sm.space_id = %s
                ORDER BY u.name
                """,
                (space_id,)
            )
        else:
            # Récupérer tous les utilisateurs
            rows = await execute_query(
                "SELECT id, name, email FROM users ORDER BY name"
            )
        
        users = [
            {
                "user_id": row['id'],
                "name": row['name'],
                "email": row['email']
            }
            for row in rows
        ]
        
        logger.info(f"[Context] Récupération de {len(users)} utilisateurs")
        return users
    except Exception as e:
        logger.error(f"[Context] Erreur lors de la récupération des utilisateurs: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur base de données: {str(e)}")


@context_router.get("/column-by-name")
async def get_column_by_name(column_name: str, space_id: Optional[str] = None, user_id: Optional[str] = "user_alice"):
    """
    Récupérer une colonne par son nom
    
    Args:
        column_name: Nom de la colonne (ex: "À faire", "En cours", "Terminé")
        space_id: ID du workspace (optionnel, utilise celui de la session si non fourni)
        user_id: ID de l'utilisateur (défaut: user_alice)
    
    Returns:
        {
            "column_id": "col_inprogress",
            "name": "En cours",
            "position": 1,
            "wip_limit": 3,
            "space_id": "space_dev"
        }
    """
    try:
        # Si space_id n'est pas fourni, récupérer depuis la session
        if not space_id:
            session = await execute_one(
                "SELECT space_id FROM sessions WHERE user_id = %s",
                (user_id,)
            )
            if session and session['space_id']:
                space_id = session['space_id']
            else:
                # Utiliser le premier workspace
                first_space = await execute_one(
                    "SELECT id FROM spaces ORDER BY created_at ASC LIMIT 1"
                )
                if first_space:
                    space_id = first_space['id']
        
        if not space_id:
            raise HTTPException(status_code=404, detail="Aucun workspace disponible")
        
        # Rechercher la colonne par nom et space_id
        column = await execute_one(
            "SELECT id, name, position, wip_limit, space_id FROM columns WHERE name = %s AND space_id = %s",
            (column_name, space_id)
        )
        
        if not column:
            logger.error(f"[Context] Colonne '{column_name}' introuvable dans workspace {space_id}")
            raise HTTPException(status_code=404, detail=f"Colonne '{column_name}' introuvable")
        
        logger.info(f"[Context] Colonne trouvée: {column_name} → {column['id']}")
        return {
            "column_id": column['id'],
            "name": column['name'],
            "position": column['position'],
            "wip_limit": column['wip_limit'],
            "space_id": column['space_id']
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[Context] Erreur lors de la récupération de la colonne: {e}")
        raise HTTPException(status_code=500, detail=f"Erreur base de données: {str(e)}")
