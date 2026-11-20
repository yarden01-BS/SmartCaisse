import pathlib

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = pathlib.Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    # URL synchrone utilisée par Alembic.
    DATABASE_URL: str
    # URL asynchrone utilisée par l'application et le script d'amorçage.
    ASYNC_DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int
    REFRESH_TOKEN_EXPIRE_MINUTES: int
    # À activer en production (HTTPS uniquement) ; désactivé pour le développement local.
    COOKIE_SECURE: bool
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")


settings = Settings()  # pyright: ignore[reportCallIssue]
