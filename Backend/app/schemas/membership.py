"""
Membership schemas.

Purpose:
- Validate membership/invite requests
- Define membership response format
- Represent user role inside a company

CompanyMembership connects:
User <-> Company
"""

from pydantic import BaseModel, EmailStr


class MemberInviteRequest(BaseModel):
    """
    Request schema for inviting/adding a user to a company.

    MVP behavior:
    - user must already exist
    - admin adds user by email
    - user receives dispatcher role by default unless role is provided
    """

    email: EmailStr
    role: str = "dispatcher"


class MembershipUpdate(BaseModel):
    """
    Request schema for changing membership.

    Used by:
    PATCH /companies/{company_id}/members/{membership_id}

    For MVP we support:
    - role change
    - status change
    """

    role: str | None = None
    status: str | None = None


class MembershipUserResponse(BaseModel):
    """
    Basic user profile nested inside membership responses.

    Sensitive fields such as password hashes and tokens are intentionally not
    included here.
    """

    id: int
    email: EmailStr
    first_name: str
    last_name: str
    phone: str | None = None
    timezone: str | None = None

    class Config:
        from_attributes = True


class MembershipResponse(BaseModel):
    """
    Response schema for company membership.

    Shows:
    - membership id
    - user id
    - company id
    - role
    - status
    """

    id: int
    user_id: int
    company_id: int
    role: str
    status: str
    user: MembershipUserResponse

    class Config:
        """
        Allows Pydantic to convert SQLAlchemy CompanyMembership model
        into MembershipResponse.
        """

        from_attributes = True
