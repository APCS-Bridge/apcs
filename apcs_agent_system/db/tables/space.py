"""
Modèle Space - Gestion des workspaces
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from db.connection import execute_query, execute_one, execute_write
from utils import generate_cuid


@dataclass
class Space:
    """Modèle workspace"""
    id: str
    name: str
    methodology: str  # 'KANBAN' ou 'SCRUM'
    owner_id: str
    created_at: datetime
    git_repo_url: Optional[str] = None  # URL du repo Git (optionnel)
    
    @classmethod
    async def find_by_id(cls, space_id: str) -> Optional['Space']:
        """Récupérer un workspace par ID"""
        query = "SELECT id, name, methodology, owner_id, created_at, git_repo_url FROM spaces WHERE id = %s"
        result = await execute_one(query, (space_id,))
        return cls(**result) if result else None
    
    @classmethod
    async def create(
        cls,
        name: str,
        owner_id: str,
        methodology: str = 'KANBAN'
    ) -> str:
        """Créer un nouveau workspace"""
        space_id = generate_cuid()
        query = """
            INSERT INTO spaces (id, name, methodology, owner_id)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """
        return await execute_write(query, (space_id, name, methodology, owner_id))
    
    @classmethod
    async def get_by_user(cls, user_id: str) -> list['Space']:
        """Récupérer tous les workspaces d'un utilisateur (propriétaire ou membre)"""
        query = """
            SELECT DISTINCT s.*
            FROM spaces s
            LEFT JOIN space_members sm ON s.id = sm.space_id
            WHERE s.owner_id = %s OR sm.user_id = %s
            ORDER BY s.created_at DESC
        """
        results = await execute_query(query, (user_id, user_id))
        return [cls(**row) for row in results]
    
    async def get_members(self) -> list[dict]:
        """Récupérer tous les membres du workspace avec leurs infos"""
        query = """
            SELECT 
                sm.id,
                sm.scrum_role,
                sm.joined_at,
                u.id as user_id,
                u.name as user_name,
                u.email as user_email
            FROM space_members sm
            JOIN users u ON sm.user_id = u.id
            WHERE sm.space_id = %s
            ORDER BY sm.joined_at ASC
        """
        return await execute_query(query, (self.id,))
    
    async def add_member(
        self,
        user_id: str,
        scrum_role: str = None
    ) -> str:
        """Ajouter un membre au workspace"""
        query = """
            INSERT INTO space_members (space_id, user_id, scrum_role)
            VALUES (%s, %s, %s)
            RETURNING id
        """
        return await execute_write(query, (self.id, user_id, scrum_role))
