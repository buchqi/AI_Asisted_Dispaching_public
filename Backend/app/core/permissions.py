"""
Permission helpers.

Purpose:
- Keep authorization logic in one place
- Check company access
- Check admin access
- Prevent duplicated permission code in services/routes

Important distinction:

Authentication:
    Who are you?
    Example: get_current_user()

Authorization / Permissions:
    What are you allowed to do?
    Example: Are you admin of this company?
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.company_membership import CompanyMembership
from app.models.truck_search_session import TruckSearchSession


def get_active_membership(
    db: Session,
    current_user: User,
    company_id: int,
) -> CompanyMembership | None:
    """
    Return active membership if user belongs to company.

    If user is not active member, return None.
    """

    return (
        db.query(CompanyMembership)
        .filter(
            CompanyMembership.user_id == current_user.id,
            CompanyMembership.company_id == company_id,
            CompanyMembership.status == "active",
        )
        .first()
    )


def require_company_member(
    db: Session,
    current_user: User,
    company_id: int,
) -> CompanyMembership:
    """
    Require user to be active member of company.

    Used when any company member can access the resource.

    Example:
    - list company trucks
    - list company drivers
    - view company searches
    """

    membership = get_active_membership(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this company",
        )

    return membership


def require_company_admin(
    db: Session,
    current_user: User,
    company_id: int,
) -> CompanyMembership:
    """
    Require user to be active admin of company.

    Used when only admins can perform the action.

    Example:
    - update company
    - invite member
    - remove member
    - change member role
    """

    membership = get_active_membership(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this company",
        )

    if membership.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company admin can perform this action",
        )

    return membership


def user_is_company_member(
    db: Session,
    current_user: User,
    company_id: int,
) -> bool:
    """
    Return True if user is active member of company.

    Useful when we need boolean checks instead of exceptions.
    """

    membership = get_active_membership(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    return membership is not None


def user_is_company_admin(
    db: Session,
    current_user: User,
    company_id: int,
) -> bool:
    """
    Return True if user is active admin of company.

    Useful when endpoint needs conditional logic.
    """

    membership = get_active_membership(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    return membership is not None and membership.role == "admin"


def require_truck_search_session_owner(
    db: Session,
    current_user: User,
    truck_search_session_id: int,
) -> TruckSearchSession:
    """
    Require the current user to own a truck search session.

    Used for dispatcher actions on active search results.
    """

    session = (
        db.query(TruckSearchSession)
        .filter(TruckSearchSession.id == truck_search_session_id)
        .first()
    )

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Truck search session not found.",
        )

    require_company_member(
        db=db,
        current_user=current_user,
        company_id=session.company_id,
    )

    if session.owner_user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner dispatcher can modify this search result.",
        )

    return session
