import pathlib

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = pathlib.Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    # Synchronous URL used by Alembic.
    DATABASE_URL: str = (
        "postgresql+psycopg2://postgres:postgres@localhost:5432/postgres"
    )
    # Asynchronous URL used by the application and the seed script.
    ASYNC_DATABASE_URL: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres"
    )
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")


settings = Settings()
