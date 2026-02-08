"""
Module de gestion des prompts pour les agents IA.

Contient des fonctions pour charger les prompts depuis des fichiers Markdown.
"""
from pathlib import Path
from typing import Union


def load_prompt_from_markdown(filename: str) -> str:
    """
    Charge le contenu d'un fichier Markdown de prompt.
    
    Args:
        filename: Nom du fichier Markdown (ex: 'orchestrator_description.md')
    
    Returns:
        Contenu du fichier en tant que chaîne de caractères
        
    Raises:
        FileNotFoundError: Si le fichier n'existe pas
    """
    prompts_dir = Path(__file__).parent
    filepath = prompts_dir / filename
    
    if not filepath.exists():
        raise FileNotFoundError(f"Le fichier de prompt '{filename}' n'existe pas dans {prompts_dir}")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.read().strip()


def load_agent_prompts(agent_name: str) -> dict[str, Union[str, list[str]]]:
    """
    Charge tous les prompts d'un agent depuis des fichiers Markdown.
    
    Args:
        agent_name: Nom de l'agent (préfixe des fichiers, ex: 'orchestrator', 'workflow', 'scrum_master')
    
    Returns:
        Dictionnaire contenant:
        - 'description': Description de l'agent (str)
        - 'instructions': Instructions de l'agent (list[str] - lignes non vides)
        - 'expected_output': Format de sortie attendu (str)
    
    Exemple:
        >>> prompts = load_agent_prompts('orchestrator')
        >>> prompts = load_agent_prompts('workflow')
        >>> prompts = load_agent_prompts('scrum_master')
    """
    description = load_prompt_from_markdown(f'descriptions/{agent_name}_description.md')
    
    # Charger les instructions et les convertir en liste de lignes
    instructions_raw = load_prompt_from_markdown(f'instructions/{agent_name}_instructions.md')
    # Convertir en liste de lignes non vides pour correspondre au format attendu par Agno
    instructions = [
        line.strip() 
        for line in instructions_raw.split('\n')
        if line.strip()  # Garder seulement les lignes non vides
    ]
    
    expected_output = load_prompt_from_markdown(f'expected_output/{agent_name}_expected_output.md')
    
    return {
        'description': description,
        'instructions': instructions,
        'expected_output': expected_output
    }

# Exports publics
__all__ = [
    'load_prompt_from_markdown',
    'load_agent_prompts',
]
