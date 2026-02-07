"""
Middleware d'authentification pour vérifier les JWT tokens
"""
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional

security = HTTPBearer()


async def get_token_from_request(request: Request) -> Optional[str]:
    """
    Extrait le token JWT de la requête (Header Authorization: Bearer <token>)
    
    Returns:
        Le token JWT ou None si absent
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return None
    
    if not auth_header.startswith("Bearer "):
        return None
    
    token = auth_header.replace("Bearer ", "")
    return token


async def require_authentication(request: Request) -> str:
    """
    Vérifie qu'un token JWT valide est présent dans la requête
    
    Returns:
        Le token JWT
        
    Raises:
        HTTPException 401 si pas de token
    """
    token = await get_token_from_request(request)
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please login to access agents.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return token
