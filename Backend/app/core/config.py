"""
This file is responsible for loading application configuration.

Purpose:
- Read environment variables from .env
- Store global application settings
- Make settings accessible everywhere in the backend

"""

# BaseSettings automatically reads values from environment variables
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Main application settings class.

    Every variable defined here will try to load
    its value from the .env file or system environment variables.
    """

    # PostgreSQL connection string
    DATABASE_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    GEMINI_API_KEY: str | None = None

    @property
    def gemini_api_key(self) -> str | None:
        return self.GEMINI_API_KEY

    """
    Pydantic settings configuration.

    env_file:
        tells Pydantic where to load environment variables from

    env_file_encoding:
        file encoding for reading .env
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )


"""
Create one global settings object.

This allows us to import settings anywhere:

from app.core.config import settings

Example:
settings.DATABASE_URL
"""
settings = Settings()
