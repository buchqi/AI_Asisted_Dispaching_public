from logging.config import fileConfig
import os
import sys

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context


"""
Allow Alembic to import the app package.

When we run Alembic from the backend folder, os.getcwd()
points to:

backend/

This makes imports like this work:

from app.db.base import Base
"""
sys.path.append(os.getcwd())


"""
Import SQLAlchemy Base and all models.

Base.metadata is what Alembic reads when it tries to detect
new tables/columns during autogenerate.

import app.models is important because it loads all model classes
registered in app/models/__init__.py.
"""
from app.db.base import Base
import app.models  # noqa: F401


# Alembic config object from alembic.ini
config = context.config


# Configure Python logging from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)


# Metadata used by Alembic autogenerate
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Run migrations in offline mode.

    Offline mode generates SQL without connecting directly
    to the database.
    """

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
    """
    Run migrations in online mode.

    Online mode connects to the database and applies migrations.
    This is what we usually use during development.
    """

    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()