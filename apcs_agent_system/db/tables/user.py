"""
Modèle User - Gestion des utilisateurs
"""
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from db.connection import execute_query, execute_one, execute_write
from utils import generate_cuid


@dataclass
class User:
    """Modèle utilisateur"""
    id: str
    email: str
    name: str
    password_hash: str
    role: str  # 'USER', 'ADMIN', 'SUPERADMIN'
    created_at: datetime
    
    @classmethod
    async def find_by_id(cls, user_id: str) -> Optional['User']:
        """Récupérer un utilisateur par ID"""
        query = "SELECT * FROM users WHERE id = %s"
        result = await execute_one(query, (user_id,))
        return cls(**result) if result else None
    
    @classmethod
    async def find_by_email(cls, email: str) -> Optional['User']:
        """Récupérer un utilisateur par email"""
        query = "SELECT * FROM users WHERE email = %s"
        result = await execute_one(query, (email,))
        return cls(**result) if result else None
    
    @classmethod
    async def create(cls, email: str, password_hash: str, name: str, role: str = 'USER') -> str:
        """Créer un nouvel utilisateur"""
        user_id = generate_cuid()
        query = """
            INSERT INTO users (id, email, password_hash, name, role)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id
        """
        return await execute_write(query, (user_id, email, password_hash, name, role))
    
    @classmethod
    async def get_all(cls) -> list['User']:
        """Récupérer tous les utilisateurs"""
        query = "SELECT * FROM users ORDER BY created_at DESC"
        results = await execute_query(query)
        return [cls(**row) for row in results]
