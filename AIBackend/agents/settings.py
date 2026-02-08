from pydantic_settings import BaseSettings


class AgentSettings(BaseSettings):
    """Agent settings that can be set using environment variables.

    Reference: https://pydantic-docs.helpmanual.io/usage/settings/
    """
    
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }

    gpt_4_mini: str = "gpt-4o-mini"
    gpt_4: str = "gpt-4o"
    embedding_model: str = "text-embedding-3-small"
    default_max_completion_tokens: int = 16000
    default_temperature: float = 0.3


# Create an TeamSettings object
agent_settings = AgentSettings()
