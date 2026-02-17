import os
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool

# Load .env so DATABASE_URL is available
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

# Add backend/ to path so app.* imports resolve
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import Base  # noqa: E402

# Import ALL models so Alembic detects every table
from app.models import (  # noqa: F401, E402
    user,
    pet,
    medication,
    vaccine,
    problem,
    allergy,
    medical_record,
    document,
    audit_log,
    emergency_share,
)

config = context.config

# Read DATABASE_URL from env; strip +asyncpg for synchronous Alembic engine
db_url = os.environ["DATABASE_URL"].replace("+asyncpg", "")
config.set_main_option("sqlalchemy.url", db_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
