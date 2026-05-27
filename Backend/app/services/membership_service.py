"""
Membership service.

Purpose:
- Manage users inside companies
- Add/invite dispatchers
- List company members
- Update member role/status
- Remove or disable members

Important:
CompanyMembership controls access between User and Company.

User
    |
    v
CompanyMembership
    |
    v
Company
"""

# todo:
# Move all permission logic to app/core/permissions.py
# and import reusable permission helpers from there
# instead of duplicating authorization checks.

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.models.user import User
from app.models.company_membership import CompanyMembership
from app.schemas.membership import MemberInviteRequest, MembershipUpdate
from app.services.auth_service import get_user_by_email


def get_membership(
    db: Session,
    user_id: int,
    company_id: int,
) -> CompanyMembership | None:
    """
    Get membership for a user inside a company.

    Used for:
    - permission checks
    - access checks
    - admin checks
    """

    return (
        db.query(CompanyMembership)
        .filter(
            CompanyMembership.user_id == user_id,
            CompanyMembership.company_id == company_id,
        )
        .first()
    )


def require_company_admin(
    db: Session,
    current_user: User,
    company_id: int,
) -> CompanyMembership:
    """
    Require current user to be active admin of company.

    If user is not admin, raise 403 Forbidden.
    """

    membership = (
        db.query(CompanyMembership)
        .filter(
            CompanyMembership.user_id == current_user.id,
            CompanyMembership.company_id == company_id,
            CompanyMembership.role == "admin",
            CompanyMembership.status == "active",
        )
        .first()
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company admin can perform this action",
        )

    return membership


def require_company_member(
    db: Session,
    current_user: User,
    company_id: int,
) -> CompanyMembership:
    """
    Require current user to be active member of company.

    If user is not a member, raise 403 Forbidden.
    """

    membership = (
        db.query(CompanyMembership)
        .filter(
            CompanyMembership.user_id == current_user.id,
            CompanyMembership.company_id == company_id,
            CompanyMembership.status == "active",
        )
        .first()
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this company",
        )

    return membership


def invite_member(
    db: Session,
    company_id: int,
    invite_data: MemberInviteRequest,
    current_user: User,
) -> CompanyMembership:
    """
    Add existing user to company.

    MVP behavior:
    - User must already exist
    - Current user must be company admin
    - New membership is created as active

    Later:
    This can become real email invitation flow.
    """

    require_company_admin(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    invited_user = get_user_by_email(
        db=db,
        email=invite_data.email,
    )

    if not invited_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User with this email does not exist",
        )

    existing_membership = get_membership(
        db=db,
        user_id=invited_user.id,
        company_id=company_id,
    )

    if existing_membership and existing_membership.status == "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already active member of this company",
        )

    if existing_membership:
        existing_membership.role = invite_data.role
        existing_membership.status = "active"

        db.commit()
        db.refresh(existing_membership)

        return get_membership_with_user(
            db=db,
            membership_id=existing_membership.id,
            company_id=company_id,
        )

    new_membership = CompanyMembership(
        user_id=invited_user.id,
        company_id=company_id,
        role=invite_data.role,
        status="active",
    )

    db.add(new_membership)
    db.commit()
    db.refresh(new_membership)

    return get_membership_with_user(
        db=db,
        membership_id=new_membership.id,
        company_id=company_id,
    )


def list_company_members(
    db: Session,
    company_id: int,
    current_user: User,
) -> list[CompanyMembership]:
    """
    List members of a company.

    Any active company member can see the member list.
    """

    require_company_member(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    return (
        db.query(CompanyMembership)
        .options(selectinload(CompanyMembership.user))
        .filter(
            CompanyMembership.company_id == company_id,
            CompanyMembership.status == "active",
        )
        .all()
    )


def update_membership(
    db: Session,
    company_id: int,
    membership_id: int,
    membership_data: MembershipUpdate,
    current_user: User,
) -> CompanyMembership:
    """
    Update member role or status.

    Only company admin can do this.
    """

    require_company_admin(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    membership = (
        db.query(CompanyMembership)
        .filter(
            CompanyMembership.id == membership_id,
            CompanyMembership.company_id == company_id,
        )
        .first()
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership not found",
        )

    if membership_data.role is not None:
        membership.role = membership_data.role

    if membership_data.status is not None:
        membership.status = membership_data.status

    db.commit()
    db.refresh(membership)

    return get_membership_with_user(
        db=db,
        membership_id=membership.id,
        company_id=company_id,
    )


def remove_membership(
    db: Session,
    company_id: int,
    membership_id: int,
    current_user: User,
) -> CompanyMembership:
    """
    Remove user from company.

    MVP behavior:
    We do not delete membership row.
    We mark it as removed.

    This preserves history.
    """

    require_company_admin(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    membership = (
        db.query(CompanyMembership)
        .filter(
            CompanyMembership.id == membership_id,
            CompanyMembership.company_id == company_id,
        )
        .first()
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership not found",
        )

    membership.status = "removed"

    db.commit()
    db.refresh(membership)

    return get_membership_with_user(
        db=db,
        membership_id=membership.id,
        company_id=company_id,
    )


def get_membership_with_user(
    db: Session,
    membership_id: int,
    company_id: int,
) -> CompanyMembership:
    """
    Load one membership with its related user for response serialization.
    """

    membership = (
        db.query(CompanyMembership)
        .options(selectinload(CompanyMembership.user))
        .filter(
            CompanyMembership.id == membership_id,
            CompanyMembership.company_id == company_id,
        )
        .first()
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership not found",
        )

    return membership
