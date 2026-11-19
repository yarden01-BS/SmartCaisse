import pathlib

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = pathlib.Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    # Synchronous URL used by Alembic.
    DATABASE_URL: str
    # Asynchronous URL used by the application and the seed script.
    ASYNC_DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_MINUTES: int
    # Enable in production (HTTPS only); disabled for local development.
    COOKIE_SECURE: bool
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")


settings = Settings()  # pyright: ignore[reportCallIssue]
