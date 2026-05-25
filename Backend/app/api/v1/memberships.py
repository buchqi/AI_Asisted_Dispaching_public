"""
Membership API endpoints.

Purpose:
- Add/invite members to company
- List company members
- Update member role/status
- Remove member from company

These endpoints require authentication.
Admin-only actions:
- invite member
- update member
- remove member
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.api.deps import get_current_user

from app.schemas.membership import (
    MemberInviteRequest,
    MembershipUpdate,
    MembershipResponse,
)

from app.services.membership_service import (
    invite_member,
    list_company_members,
    update_membership,
    remove_membership,
)


router = APIRouter(
    prefix="/companies/{company_id}/members",
    tags=["Company Members"],
)


@router.post(
    "/invite",
    response_model=MembershipResponse,
)
def invite_member_endpoint(
    company_id: int,
    invite_data: MemberInviteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Invite/add existing user to company.

    MVP behavior:
    - User must already exist
    - Current user must be company admin
    - Member is activated immediately
    """

    return invite_member(
        db=db,
        company_id=company_id,
        invite_data=invite_data,
        current_user=current_user,
    )


@router.get(
    "",
    response_model=list[MembershipResponse],
)
def list_company_members_endpoint(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List company members.

    Any active company member can view members.
    """

    return list_company_members(
        db=db,
        company_id=company_id,
        current_user=current_user,
    )


@router.patch(
    "/{membership_id}",
    response_model=MembershipResponse,
)
def update_membership_endpoint(
    company_id: int,
    membership_id: int,
    membership_data: MembershipUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update member role/status.

    Only company admin can update memberships.
    """

    return update_membership(
        db=db,
        company_id=company_id,
        membership_id=membership_id,
        membership_data=membership_data,
        current_user=current_user,
    )


@router.delete(
    "/{membership_id}",
    response_model=MembershipResponse,
)
def remove_membership_endpoint(
    company_id: int,
    membership_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Remove member from company.

    MVP behavior:
    - Do not delete row
    - Mark membership status as removed
    """

    return remove_membership(
        db=db,
        company_id=company_id,
        membership_id=membership_id,
        current_user=current_user,
    )