import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# This part programmatically finds your project's root directory and the .env file.
ENV_FILE_PATH = Path(__file__).resolve().parent.parent.parent / '.env'

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE_PATH, env_file_encoding='utf-8')

    # Define ALL your environment variables here
    GOOGLE_API_KEY: str
    OPENAI_API_KEY: str     # Add this line
    DATABASE_URL: str       # Add this line

# Create a single instance that the rest of your app can import and use
settings = Settings()