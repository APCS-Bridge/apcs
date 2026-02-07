"""
Modèle BacklogItem - Product Backlog (liste globale des user stories)
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from db.connection import execute_query, execute_one, execute_write
from utils import generate_cuid


@dataclass
class BacklogItem:
    """Item du Product Backlog"""
    id: str
    space_id: str
    title: str
    created_by_id: str
    sequence_number: int  # Numéro de référence unique (#1, #2, #3...)
    position: int  # Ordre de priorité dans le backlog
    description: Optional[str] = None
    assignee_id: Optional[str] = None
    created_at: datetime = None
    
    @classmethod
    async def find_by_id(cls, item_id: str) -> Optional['BacklogItem']:
        """Récupérer un item par ID"""
        query = "SELECT * FROM backlog_items WHERE id = %s"
        result = await execute_one(query, (item_id,))
        return cls(**result) if result else None
    
    @classmethod
    async def find_by_sequence(cls, space_id: str, sequence_number: int) -> Optional['BacklogItem']:
        """Récupérer un item par son numéro (#123)"""
        query = """
            SELECT * FROM backlog_items 
            WHERE space_id = %s AND sequence_number = %s
        """
        result = await execute_one(query, (space_id, sequence_number))
        return cls(**result) if result else None
    
    @classmethod
    async def get_by_space(cls, space_id: str) -> list[dict]:
        """Récupérer tous les items du backlog avec infos complètes"""
        query = """
            SELECT 
                bi.*,
                creator.name as created_by_name,
                assignee.name as assignee_name
            FROM backlog_items bi
            LEFT JOIN users creator ON bi.created_by_id = creator.id
            LEFT JOIN users assignee ON bi.assignee_id = assignee.id
            WHERE bi.space_id = %s
            ORDER BY bi.position ASC
        """
        return await execute_query(query, (space_id,))
    
    @classmethod
    async def create(
        cls,
        space_id: str,
        title: str,
        created_by_id: str,
        description: str = None,
        assignee_id: str = None
    ) -> str:
        """Créer un nouvel item dans le backlog"""
        item_id = generate_cuid()
        query = """
            INSERT INTO backlog_items (
                id, space_id, title, description, assignee_id, created_by_id
            )
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """
        return await execute_write(
            query,
            (item_id, space_id, title, description, assignee_id, created_by_id)
        )
    
    async def update(self, **kwargs) -> None:
        """Mettre à jour l'item"""
        allowed = {'title', 'description', 'assignee_id', 'position'}
        updates = {k: v for k, v in kwargs.items() if k in allowed}
        
        if not updates:
            return
        
        set_clause = ', '.join([f"{k} = %s" for k in updates.keys()])
        values = tuple(updates.values()) + (self.id,)
        
        query = f"UPDATE backlog_items SET {set_clause} WHERE id = %s"
        await execute_write(query, values, returning=False)
    
    async def move(self, new_position: int) -> None:
        """Changer la position dans le Product Backlog"""
        query = "UPDATE backlog_items SET position = %s WHERE id = %s"
        await execute_write(query, (new_position, self.id), returning=False)
