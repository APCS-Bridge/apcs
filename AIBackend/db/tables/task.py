"""
Modèle Task - Tâches kanban liées au backlog
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from db.connection import execute_query, execute_one, execute_write
from utils import generate_cuid


@dataclass
class Task:
    """Tâche kanban"""
    id: str
    assignee_id: Optional[str] = None
    backlog_item_id: Optional[str] = None  # Pour KANBAN
    sprint_backlog_item_id: Optional[str] = None  # Pour SCRUM
    created_at: datetime = None
    
    @classmethod
    async def find_by_id(cls, task_id: str) -> Optional['Task']:
        """Récupérer une tâche par ID"""
        query = "SELECT * FROM tasks WHERE id = %s"
        result = await execute_one(query, (task_id,))
        return cls(**result) if result else None
    
    @classmethod
    async def get_by_backlog_item(cls, backlog_item_id: str) -> list['Task']:
        """Récupérer toutes les tâches d'un item du backlog"""
        query = """
            SELECT * FROM tasks
            WHERE backlog_item_id = %s
        """
        results = await execute_query(query, (backlog_item_id,))
        return [cls(**row) for row in results]
    
    @classmethod
    async def get_by_sprint(cls, sprint_id: str) -> list[dict]:
        """Récupérer toutes les tâches d'un sprint avec infos complètes"""
        query = """
            SELECT 
                t.*,
                sbi.story_points,
                bi.title,
                bi.sequence_number,
                bi.description,
                assignee.name as assignee_name,
                ct.column_id,
                ct.position,
                ct.moved_at,
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
        return await execute_query(query, (sprint_id,))
    
    @classmethod
    async def get_kanban_board(cls, space_id: str) -> dict:
        """Récupérer le board kanban complet avec colonnes (KANBAN mode)"""
        # Récupérer toutes les colonnes du space
        columns_query = """
            SELECT * FROM columns
            WHERE space_id = %s
            ORDER BY position ASC
        """
        columns = await execute_query(columns_query, (space_id,))
        
        # Pour chaque colonne, récupérer les tâches
        board = {}
        for column in columns:
            tasks_query = """
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
            tasks = await execute_query(tasks_query, (column['id'],))
            board[column['name']] = {
                'column': column,
                'tasks': tasks
            }
        
        return board
    
    @classmethod
    async def get_sprint_board(cls, sprint_id: str) -> dict:
        """Récupérer le board kanban d'un sprint avec colonnes (SCRUM mode)"""
        # Récupérer toutes les colonnes du sprint
        columns_query = """
            SELECT * FROM columns
            WHERE sprint_id = %s
            ORDER BY position ASC
        """
        columns = await execute_query(columns_query, (sprint_id,))
        
        # Pour chaque colonne, récupérer les tâches
        board = {}
        for column in columns:
            tasks_query = """
                SELECT 
                    ct.position,
                    ct.moved_at,
                    t.*,
                    bi.title,
                    sbi.story_points,
                    bi.sequence_number,
                    bi.description,
                    assignee.name as assignee_name
                FROM columns_tasks ct
                JOIN tasks t ON ct.task_id = t.id
                JOIN sprint_backlog_items sbi ON t.sprint_backlog_item_id = sbi.id
                JOIN backlog_items bi ON sbi.backlog_item_id = bi.id
                LEFT JOIN users assignee ON t.assignee_id = assignee.id
                WHERE ct.column_id = %s
                ORDER BY ct.position ASC
            """
            tasks = await execute_query(tasks_query, (column['id'],))
            board[column['name']] = {
                'column': column,
                'tasks': tasks
            }
        
        return board
    
    @classmethod
    async def create(
        cls,
        assignee_id: str = None,
        backlog_item_id: str = None,
        sprint_backlog_item_id: str = None
    ) -> str:
        """Créer une nouvelle tâche (KANBAN: backlog_item_id, SCRUM: sprint_backlog_item_id)"""
        # Validation: au moins un des deux IDs requis
        if not backlog_item_id and not sprint_backlog_item_id:
            raise ValueError("backlog_item_id ou sprint_backlog_item_id requis")
        
        # Générer un CUID pour l'ID
        task_id = generate_cuid()
        
        query = """
            INSERT INTO tasks (id, backlog_item_id, sprint_backlog_item_id, assignee_id)
            VALUES (%s, %s, %s, %s)
            RETURNING id
        """
        return await execute_write(query, (task_id, backlog_item_id, sprint_backlog_item_id, assignee_id))
    
    async def move_to_column(self, column_id: str, position: int = 0) -> None:
        """Déplacer la tâche vers une colonne (drag & drop kanban)"""
        # Vérifier si la tâche existe déjà dans columns_tasks
        check_query = "SELECT id FROM columns_tasks WHERE task_id = %s"
        existing = await execute_one(check_query, (self.id,))
        
        if existing:
            # Mettre à jour la colonne et la position
            update_query = """
                UPDATE columns_tasks
                SET column_id = %s, position = %s, moved_at = CURRENT_TIMESTAMP
                WHERE task_id = %s
            """
            await execute_write(update_query, (column_id, position, self.id), returning=False)
        else:
            # Créer l'entrée avec un ID CUID
            ct_id = generate_cuid()
            insert_query = """
                INSERT INTO columns_tasks (id, column_id, task_id, position)
                VALUES (%s, %s, %s, %s)
            """
            await execute_write(insert_query, (ct_id, column_id, self.id, position), returning=False)
    
    async def get_column(self) -> Optional[dict]:
        """Récupérer la colonne actuelle de la tâche"""
        query = """
            SELECT 
                c.*,
                ct.position,
                ct.moved_at
            FROM columns_tasks ct
            JOIN columns c ON ct.column_id = c.id
            WHERE ct.task_id = %s
        """
        return await execute_one(query, (self.id,))
    
    async def assign(self, assignee_id: str) -> None:
        """Assigner la tâche à un utilisateur"""
        query = "UPDATE tasks SET assignee_id = %s WHERE id = %s"
        await execute_write(query, (assignee_id, self.id), returning=False)

