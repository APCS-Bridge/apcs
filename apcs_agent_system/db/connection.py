"""
Gestionnaire de connexion PostgreSQL - Singleton avec connexion unique.
Utilise psycopg3 (async) avec fetch associatif (dictionnaires).
"""
import logging
import os
import sys
from typing import Optional

import psycopg
from psycopg import AsyncConnection
from psycopg.rows import dict_row

# Logger simple pour éviter les problèmes avec Rich sur stdio
logger = logging.getLogger(__name__)
if not logger.handlers:
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


class Database:
    """Singleton - Gestionnaire de connexion unique à PostgreSQL"""
    
    _instance: Optional['Database'] = None
    _conn: Optional[AsyncConnection] = None
    
    def __new__(cls):
        """Pattern Singleton - une seule instance"""
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialisation (appelée qu'une fois grâce au singleton)"""
        if not hasattr(self, 'initialized'):
            self.database_url = os.getenv(
                "DATABASE_URL",
                "postgresql://microhack:securepassword@localhost:5432/collaboration_platform"
            )
            self.initialized = True
    
    async def connect(self):
        """Se connecter à la base de données (une seule fois)"""
        if self._conn is None or self._conn.closed:
            logger.info("🔌 Connexion à PostgreSQL...")
            self._conn = await psycopg.AsyncConnection.connect(
                self.database_url,
                row_factory=dict_row,  # Retourne des dictionnaires
                autocommit=False
            )
            logger.info("✅ Connecté à PostgreSQL")
    
    async def disconnect(self):
        """Fermer la connexion"""
        if self._conn and not self._conn.closed:
            await self._conn.close()
            self._conn = None
            logger.info("🔌 Connexion fermée")
    
    async def get_conn(self) -> AsyncConnection:
        """Obtenir la connexion unique (auto-connect si nécessaire)"""
        if self._conn is None or self._conn.closed:
            await self.connect()
        return self._conn


# Instance globale singleton
db = Database()


async def execute_query(query: str, params: tuple = None) -> list[dict]:
    """
    Exécuter une requête SELECT et retourner les résultats (associatif)
    
    Args:
        query: Requête SQL avec placeholders (%s)
        params: Paramètres de la requête
    
    Returns:
        Liste de dictionnaires
    """
    conn = await db.get_conn()
    try:
        async with conn.cursor() as cur:
            await cur.execute(query, params or ())
            results = await cur.fetchall()
            return results
    except Exception as e:
        await conn.rollback()
        raise e


async def execute_one(query: str, params: tuple = None) -> dict | None:
    """
    Exécuter une requête SELECT et retourner un seul résultat (associatif)
    
    Args:
        query: Requête SQL avec placeholders (%s)
        params: Paramètres de la requête
    
    Returns:
        Dictionnaire ou None
    """
    conn = await db.get_conn()
    try:
        async with conn.cursor() as cur:
            await cur.execute(query, params or ())
            result = await cur.fetchone()
            return result
    except Exception as e:
        await conn.rollback()
        raise e


async def execute_write(query: str, params: tuple = None, returning: bool = True) -> str | None:
    """
    Exécuter une requête INSERT/UPDATE/DELETE
    
    Args:
        query: Requête SQL avec placeholders (%s)
        params: Paramètres de la requête
        returning: Si True, attend un RETURNING id
    
    Returns:
        ID de l'entité créée/modifiée (si RETURNING id dans la requête)
    """
    conn = await db.get_conn()
    try:
        async with conn.cursor() as cur:
            await cur.execute(query, params or ())
            await conn.commit()
            
            # Si RETURNING id
            if returning and cur.description:
                result = await cur.fetchone()
                return result.get('id') if result else None
            
            return None
    except Exception as e:
        # Rollback la transaction en erreur pour éviter "transaction aborted"
        await conn.rollback()
        raise e


async def execute_many(query: str, params_list: list[tuple]) -> None:
    """
    Exécuter plusieurs requêtes INSERT/UPDATE en batch
    
    Args:
        query: Requête SQL avec placeholders (%s)
        params_list: Liste de tuples de paramètres
    """
    conn = await db.get_conn()
    async with conn.cursor() as cur:
        await cur.executemany(query, params_list)
        await conn.commit()
