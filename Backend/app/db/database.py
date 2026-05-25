"""
This file creates the SQLAlchemy database connection.

Purpose:
- Create database engine
- Create session factory
- Connect FastAPI backend to PostgreSQL

Think of this file as:
"The bridge between Python and PostgreSQL"
"""

# create_engine:
# creates the main database connection engine
from sqlalchemy import create_engine

# sessionmaker:
# creates database sessions used to talk to PostgreSQL
from sqlalchemy.orm import sessionmaker

# Import application settings
from app.core.config import settings


"""
Create SQLAlchemy engine.
settings.DATABASE_URL comes from:
.env

Example:
postgresql://postgres:password@localhost:5432/ai_dispatching_db
"""
engine = create_engine(settings.DATABASE_URL)


"""
Create database session factory.

autocommit=False:
    changes are NOT automatically saved

autoflush=False:
    SQLAlchemy will not automatically push changes

bind=engine:
    connect sessions to our PostgreSQL engine
"""
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)