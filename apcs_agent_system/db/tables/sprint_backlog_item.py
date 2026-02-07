"""
Modèle SprintBacklogItem - Items sélectionnés pour un sprint (SCRUM)
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from db.connection import execute_query, execute_one, execute_write


@dataclass
class SprintBacklogItem:
    """Item du Sprint Backlog"""
    id: str
    sprint_id: str
    backlog_item_id: str
    position: int
    story_points: Optional[int] = None
    added_at: datetime = None
    
    @classmethod
    async def find_by_id(cls, item_id: str) -> Optional['SprintBacklogItem']:
        """Récupérer un sprint backlog item par ID"""
        query = "SELECT * FROM sprint_backlog_items WHERE id = %s"
        result = await execute_one(query, (item_id,))
        return cls(**result) if result else None
    
    @classmethod
    async def get_by_sprint(cls, sprint_id: str) -> list[dict]:
        """Récupérer tous les items du sprint backlog avec infos complètes"""
        query = """
            SELECT 
                sbi.*,
                bi.title,
                bi.description,
                bi.sequence_number,
                bi.assignee_id,
                assignee.name as assignee_name,
                creator.name as created_by_name
            FROM sprint_backlog_items sbi
            JOIN backlog_items bi ON sbi.backlog_item_id = bi.id
            LEFT JOIN users assignee ON bi.assignee_id = assignee.id
            LEFT JOIN users creator ON bi.created_by_id = creator.id
            WHERE sbi.sprint_id = %s
            ORDER BY sbi.position ASC
        """
        return await execute_query(query, (sprint_id,))
    
    @classmethod
    async def get_by_backlog_item(cls, backlog_item_id: str) -> list['SprintBacklogItem']:
        """Récupérer tous les sprints où cet item a été utilisé"""
        query = """
            SELECT * FROM sprint_backlog_items
            WHERE backlog_item_id = %s
            ORDER BY added_at DESC
        """
        results = await execute_query(query, (backlog_item_id,))
        return [cls(**row) for row in results]
    
    @classmethod
    async def add_to_sprint(
        cls,
        sprint_id: str,
        backlog_item_id: str,
        story_points: int = None,
        position: int = 0
    ) -> str:
        """Ajouter un item du Product Backlog au Sprint Backlog"""
        query = """
            INSERT INTO sprint_backlog_items (sprint_id, backlog_item_id, story_points, position)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """
        return await execute_write(query, (sprint_id, backlog_item_id, story_points, position))
    
    @classmethod
    async def is_in_sprint(cls, sprint_id: str, backlog_item_id: str) -> bool:
        """Vérifier si un item est déjà dans le sprint"""
        query = """
            SELECT id FROM sprint_backlog_items
            WHERE sprint_id = %s AND backlog_item_id = %s
        """
        result = await execute_one(query, (sprint_id, backlog_item_id))
        return result is not None
    
    async def update_story_points(self, story_points: int) -> None:
        """Mettre à jour l'estimation en story points"""
        query = "UPDATE sprint_backlog_items SET story_points = %s WHERE id = %s"
        await execute_write(query, (story_points, self.id), returning=False)
    
    async def update_position(self, position: int) -> None:
        """Mettre à jour la position dans le sprint backlog"""
        query = "UPDATE sprint_backlog_items SET position = %s WHERE id = %s"
        await execute_write(query, (position, self.id), returning=False)
    
    async def get_tasks(self) -> list[dict]:
        """Récupérer toutes les tâches créées pour cet item de sprint"""
        query = """
            SELECT 
                t.*,
                assignee.name as assignee_name,
                ct.column_id,
                ct.position,
                c.name as column_name
            FROM tasks t
            LEFT JOIN users assignee ON t.assignee_id = assignee.id
            LEFT JOIN columns_tasks ct ON t.id = ct.task_id
            LEFT JOIN columns c ON ct.column_id = c.id
            WHERE t.sprint_backlog_item_id = %s
            ORDER BY c.position ASC, ct.position ASC
        """
        return await execute_query(query, (self.id,))
    
    async def get_total_story_points_for_sprint(sprint_id: str) -> int:
        """Calculer le total des story points pour un sprint"""
        query = """
            SELECT COALESCE(SUM(story_points), 0) as total
            FROM sprint_backlog_items
            WHERE sprint_id = %s
        """
        result = await execute_one(query, (sprint_id,))
        return result['total'] if result else 0
