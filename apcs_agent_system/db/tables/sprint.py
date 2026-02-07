"""
Modèle Sprint - Gestion des sprints (SCRUM uniquement)
"""
from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional

from db.connection import execute_query, execute_one, execute_write
from utils import generate_cuid


@dataclass
class Sprint:
    """Modèle Sprint"""
    id: str
    space_id: str
    name: str
    start_date: date
    end_date: date
    status: str  # 'PLANNED', 'ACTIVE', 'COMPLETED'
    goal: Optional[str] = None
    created_at: datetime = None
    
    @classmethod
    async def find_by_id(cls, sprint_id: str) -> Optional['Sprint']:
        """Récupérer un sprint par ID"""
        query = "SELECT * FROM sprints WHERE id = %s"
        result = await execute_one(query, (sprint_id,))
        return cls(**result) if result else None
    
    @classmethod
    async def get_by_space(cls, space_id: str) -> list['Sprint']:
        """Récupérer tous les sprints d'un workspace"""
        query = """
            SELECT * FROM sprints 
            WHERE space_id = %s
            ORDER BY start_date DESC
        """
        results = await execute_query(query, (space_id,))
        return [cls(**row) for row in results]
    
    @classmethod
    async def get_active(cls, space_id: str) -> Optional['Sprint']:
        """Récupérer le sprint actif du workspace"""
        query = """
            SELECT * FROM sprints
            WHERE space_id = %s AND status = 'ACTIVE'
            ORDER BY start_date DESC
            LIMIT 1
        """
        result = await execute_one(query, (space_id,))
        return cls(**result) if result else None
    
    @classmethod
    async def create(
        cls,
        space_id: str,
        name: str,
        start_date: date,
        end_date: date,
        goal: str = None,
        status: str = 'PLANNED'
    ) -> str:
        """Créer un nouveau sprint"""
        sprint_id = generate_cuid()
        query = """
            INSERT INTO sprints (id, space_id, name, start_date, end_date, goal, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """
        return await execute_write(
            query,
            (sprint_id, space_id, name, start_date, end_date, goal, status)
        )
    
    async def get_tasks(self) -> list[dict]:
        """Récupérer toutes les tâches du sprint avec infos"""
        query = """
            SELECT 
                t.*,
                sbi.story_points,
                bi.title as backlog_title,
                bi.sequence_number,
                assignee.name as assignee_name,
                ct.column_id,
                ct.position,
                c.name as column_name
            FROM tasks t
            JOIN sprint_backlog_items sbi ON t.sprint_backlog_item_id = sbi.id
            JOIN backlog_items bi ON sbi.backlog_item_id = bi.id
            LEFT JOIN users assignee ON t.assignee_id = assignee.id
            LEFT JOIN columns_tasks ct ON t.id = ct.task_id
            LEFT JOIN columns c ON ct.column_id = c.id
            WHERE sbi.sprint_id = %s
            ORDER BY c.position ASC, ct.position ASC
        """
        return await execute_query(query, (self.id,))
    
    async def update_status(self, status: str) -> None:
        """Changer le statut du sprint"""
        query = "UPDATE sprints SET status = %s WHERE id = %s"
        await execute_write(query, (status, self.id), returning=False)
    
    async def get_backlog_items(self) -> list[dict]:
        """Récupérer les items du Sprint Backlog avec leurs story points"""
        query = """
            SELECT 
                sbi.*,
                bi.title,
                bi.sequence_number,
                bi.description,
                assignee.name as assignee_name
            FROM sprint_backlog_items sbi
            JOIN backlog_items bi ON sbi.backlog_item_id = bi.id
            LEFT JOIN users assignee ON bi.assignee_id = assignee.id
            WHERE sbi.sprint_id = %s
            ORDER BY sbi.position ASC
        """
        return await execute_query(query, (self.id,))
