import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from src.core.config import settings
from src.db.models import Base

# Cet objet est la configuration Alembic, qui fournit
# l'accès aux valeurs du fichier .ini en cours d'utilisation.
config = context.config
config.set_main_option("sqlalchemy.url", settings.ASYNC_DATABASE_URL.replace("%", "%%"))

# Interprète le fichier de configuration pour la journalisation Python.
# Cette ligne configure les journaux de base.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Ajoutez ici l'objet MetaData de votre modèle
# pour la prise en charge de l'autogénération
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
target_metadata = Base.metadata

# D'autres valeurs de la configuration, définies selon les besoins de env.py,
# peuvent être récupérées :
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def run_migrations_offline() -> None:
    """Exécute les migrations en mode « hors ligne ».

    Cela configure le contexte avec une simple URL
    et non un moteur, même si un moteur est également
    acceptable ici. En évitant la création du moteur,
    nous n'avons même pas besoin qu'un DBAPI soit disponible.

    Les appels à context.execute() ici émettent la chaîne donnée vers
    la sortie du script.

    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Exécute les migrations en mode « en ligne ».

    Dans ce scénario, nous devons créer un moteur asynchrone
    et associer une connexion au contexte.

    """
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
