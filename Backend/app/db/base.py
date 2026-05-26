"""
Base class for all SQLAlchemy models.

Purpose:
- Every database model inherits from Base
- SQLAlchemy tracks all tables through Base.metadata
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    Parent class for all SQLAlchemy models.
    """

    pass