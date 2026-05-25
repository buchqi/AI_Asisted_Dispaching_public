"""
This file provides database sessions to FastAPI routes.

Purpose:
- Open database session
- Give session to endpoint/service
- Close session safely after request finishes

This is extremely important because:
Leaving database sessions open can cause memory leaks
and connection problems.
"""

# Import session factory
from app.db.database import SessionLocal


def get_db():
    """
    FastAPI database dependency.

    What happens here?

    1. Create database session
    2. Give session to endpoint
    3. Automatically close session after request ends

    FastAPI endpoints will use it like:

    db: Session = Depends(get_db)
    """

    # Create database session
    db = SessionLocal()

    try:
        # Give session to endpoint/service
        yield db

    finally:
        # Always close session safely
        db.close()