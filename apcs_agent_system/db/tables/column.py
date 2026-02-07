"""
Modèle Column - Gestion des colonnes kanban
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from db.connection import execute_query, execute_one, execute_write
from utils import generate_cuid


@dataclass
class Column:
    """Colonne kanban"""
    id: str
    name: str
    position: int
    space_id: Optional[str] = None  # NULL si colonne de sprint
    sprint_id: Optional[str] = None  # NULL si colonne de space
    wip_limit: Optional[int] = None  # Limite Work In Progress (NULL = illimité)
    created_at: datetime = None
    
    @classmethod
    async def find_by_id(cls, column_id: str) -> Optional['Column']:
        """Récupérer une colonne par ID"""
        query = "SELECT * FROM columns WHERE id = %s"
        result = await execute_one(query, (column_id,))
        return cls(**result) if result else None
    
    @classmethod
    async def get_by_space(cls, space_id: str) -> list['Column']:
        """Récupérer toutes les colonnes d'un workspace KANBAN"""
        query = """
            SELECT * FROM columns
            WHERE space_id = %s
            ORDER BY position ASC
        """
        results = await execute_query(query, (space_id,))
        return [cls(**row) for row in results]
    
    @classmethod
    async def get_first_column_for_space(cls, space_id: str) -> Optional[dict]:
        """Récupérer la première colonne (To Do) d'un workspace"""
        query = """
            SELECT * FROM columns
            WHERE space_id = %s
            ORDER BY position ASC
            LIMIT 1
        """
        return await execute_one(query, (space_id,))
    
    @classmethod
    async def get_by_sprint(cls, sprint_id: str) -> list['Column']:
        """Récupérer toutes les colonnes d'un sprint SCRUM"""
        query = """
            SELECT * FROM columns
            WHERE sprint_id = %s
            ORDER BY position ASC
        """
        results = await execute_query(query, (sprint_id,))
        return [cls(**row) for row in results]
    
    @classmethod
    async def create_for_space(
        cls,
        space_id: str,
        name: str,
        position: int = 0,
        wip_limit: int = None
    ) -> str:
        """Créer une colonne pour un workspace KANBAN"""
        column_id = generate_cuid()
        query = """
            INSERT INTO columns (id, space_id, name, position, wip_limit)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """
        return await execute_write(query, (column_id, space_id, name, position, wip_limit))
    
    @classmethod
    async def create_for_sprint(
        cls,
        sprint_id: str,
        name: str,
        position: int = 0,
        wip_limit: int = None
    ) -> str:
        """Créer une colonne pour un sprint SCRUM"""
        column_id = generate_cuid()
        query = """
            INSERT INTO columns (id, sprint_id, name, position, wip_limit)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """
        return await execute_write(query, (column_id, sprint_id, name, position, wip_limit))
    
    async def get_tasks(self) -> list[dict]:
        """Récupérer toutes les tâches de cette colonne"""
        query = """
            SELECT 
                ct.position,
                ct.moved_at,
                t.*,
                bi.title,
                bi.sequence_number,
                bi.description,
                assignee.name as assignee_name
            FROM columns_tasks ct
            JOIN tasks t ON ct.task_id = t.id
            JOIN backlog_items bi ON t.backlog_item_id = bi.id
            LEFT JOIN users assignee ON t.assignee_id = assignee.id
            WHERE ct.column_id = %s
            ORDER BY ct.position ASC
        """
        return await execute_query(query, (self.id,))
    
    async def get_task_count(self) -> int:
        """Compter le nombre de tâches dans la colonne"""
        query = "SELECT COUNT(*) as count FROM columns_tasks WHERE column_id = %s"
        result = await execute_one(query, (self.id,))
        return result['count'] if result else 0
    
    async def is_wip_exceeded(self) -> bool:
        """Vérifier si la limite WIP est dépassée"""
        if self.wip_limit is None:
            return False
        count = await self.get_task_count()
        return count > self.wip_limit
    
    async def update(self, **kwargs) -> None:
        """Mettre à jour la colonne"""
        allowed = {'name', 'position', 'wip_limit'}
        updates = {k: v for k, v in kwargs.items() if k in allowed}
        
        if not updates:
            return
        
        set_clause = ', '.join([f"{k} = %s" for k in updates.keys()])
        values = tuple(updates.values()) + (self.id,)
        
        query = f"UPDATE columns SET {set_clause} WHERE id = %s"
        await execute_write(query, values, returning=False)
