"""
Company service.

Purpose:
- Create companies
- List companies for current user
- Get company by id
- Update company
- Automatically create admin membership for company creator

Architecture rule:
API routes should call this service.
This service contains the business logic.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.company import Company
from app.models.company_membership import CompanyMembership
from app.models.user import User
from app.schemas.company import CompanyCreate, CompanyUpdate

# todo:
# Replace manual admin membership check with
# centralized require_company_admin() helper
# from app/core/permissions.py


def create_company(
    db: Session,
    company_data: CompanyCreate,
    current_user: User,
) -> Company:
    """
    Create a new company.

    Flow:
    1. Create Company row
    2. Save company to database
    3. Create CompanyMembership row
    4. Make creator admin of that company
    5. Return created company

    Important:
    Company creator automatically becomes admin.
    """

    new_company = Company(
        name=company_data.name,
    )

    db.add(new_company)
    db.commit()
    db.refresh(new_company)

    admin_membership = CompanyMembership(
        user_id=current_user.id,
        company_id=new_company.id,
        role="admin",
        status="active",
    )

    db.add(admin_membership)
    db.commit()

    return new_company


def list_my_companies(
    db: Session,
    current_user: User,
) -> list[Company]:
    """
    List companies where current user has active membership.

    This is used by:
    GET /companies

    It returns only companies the authenticated user belongs to.
    """

    companies = (
        db.query(Company)
        .join(CompanyMembership)
        .filter(
            CompanyMembership.user_id == current_user.id,
            CompanyMembership.status == "active",
        )
        .all()
    )

    return companies


def get_company_by_id(
    db: Session,
    company_id: int,
) -> Company | None:
    """
    Get company by database id.

    This helper does not check permissions by itself.
    Permission checks are handled separately.
    """

    return db.query(Company).filter(
        Company.id == company_id
    ).first()


def get_my_company(
    db: Session,
    company_id: int,
    current_user: User,
) -> Company:
    """
    Get one company if current user is an active member.

    Used by:
    GET /companies/{company_id}
    """

    company = (
        db.query(Company)
        .join(CompanyMembership)
        .filter(
            Company.id == company_id,
            CompanyMembership.user_id == current_user.id,
            CompanyMembership.status == "active",
        )
        .first()
    )

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found or access denied",
        )

    return company


def update_company(
    db: Session,
    company_id: int,
    company_data: CompanyUpdate,
    current_user: User,
) -> Company:
    """
    Update company information.

    For MVP:
    Only company admin should be allowed to update company.

    Flow:
    1. Check admin membership
    2. Find company
    3. Update allowed fields
    4. Save changes
    5. Return updated company
    """

    admin_membership = (
        db.query(CompanyMembership)
        .filter(
            CompanyMembership.company_id == company_id,
            CompanyMembership.user_id == current_user.id,
            CompanyMembership.role == "admin",
            CompanyMembership.status == "active",
        )
        .first()
    )

    if not admin_membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company admin can update company",
        )

    company = get_company_by_id(
        db=db,
        company_id=company_id,
    )

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    if company_data.name is not None:
        company.name = company_data.name

    db.commit()
    db.refresh(company)

    return company