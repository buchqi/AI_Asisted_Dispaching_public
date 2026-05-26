"""
Company-scoped load-board session API routes.

These endpoints manage company-level load-board session records only.
They do not perform real browser login or store cookies yet.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.schemas.load_board import (
    LoadBoardSessionCreate,
    LoadBoardSessionHealthCheck,
    LoadBoardSessionResponse,
    LoadBoardSessionUpdate,
)
from app.services import load_board_service
from app.services.membership_service import require_company_member
from app.api.deps import get_current_user


router = APIRouter(tags=["Load Boards"])


@router.post(
    "/companies/{company_id}/load-boards",
    response_model=LoadBoardSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_company_load_board_session(
    company_id: int,
    data: LoadBoardSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a load-board session record for a company.

    Access rule:
    - current user must be an active member of the company.
    """

    require_company_member(
        db=db,
        company_id=company_id,
        current_user=current_user,
    )

    return load_board_service.create_load_board_session(
        db=db,
        company_id=company_id,
        data=data,
    )


@router.get(
    "/companies/{company_id}/load-boards",
    response_model=list[LoadBoardSessionResponse],
)
def list_company_load_board_sessions(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all load-board session records belonging to a company.

    Access rule:
    - current user must be an active member of the company.
    """

    require_company_member(
        db=db,
        company_id=company_id,
        current_user=current_user,
    )

    return load_board_service.list_company_load_board_sessions(
        db=db,
        company_id=company_id,
    )


@router.get(
    "/companies/{company_id}/load-boards/{session_id}",
    response_model=LoadBoardSessionResponse,
)
def get_company_load_board_session(
    company_id: int,
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get one company load-board session by id.

    Access rule:
    - current user must be an active member of the company.
    - session must belong to the requested company.
    """

    require_company_member(
        db=db,
        company_id=company_id,
        current_user=current_user,
    )

    session = load_board_service.get_load_board_session(
        db=db,
        session_id=session_id,
    )

    if session is None or session.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Load-board session not found.",
        )

    return session


@router.patch(
    "/companies/{company_id}/load-boards/{session_id}",
    response_model=LoadBoardSessionResponse,
)
def update_company_load_board_session(
    company_id: int,
    session_id: int,
    data: LoadBoardSessionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Partially update a company load-board session.

    Access rule:
    - current user must be an active member of the company.
    - session must belong to the requested company.
    """

    require_company_member(
        db=db,
        company_id=company_id,
        current_user=current_user,
    )

    session = load_board_service.get_load_board_session(
        db=db,
        session_id=session_id,
    )

    if session is None or session.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Load-board session not found.",
        )

    return load_board_service.update_load_board_session(
        db=db,
        session=session,
        data=data,
    )


@router.post(
    "/companies/{company_id}/load-boards/{session_id}/check-health",
    response_model=LoadBoardSessionResponse,
)
def check_company_load_board_session_health(
    company_id: int,
    session_id: int,
    data: LoadBoardSessionHealthCheck,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Store a health-check result for a company load-board session.

    MVP behavior:
    - This endpoint manually stores health/debug information.
    - It does not yet contact the real load-board website.
    """

    require_company_member(
        db=db,
        company_id=company_id,
        current_user=current_user,
    )

    session = load_board_service.get_load_board_session(
        db=db,
        session_id=session_id,
    )

    if session is None or session.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Load-board session not found.",
        )

    return load_board_service.check_load_board_session_health(
        db=db,
        session=session,
        data=data,
    )
