"""
Company API endpoints.

Purpose:
- Create company
- List companies current user belongs to
- Get one company
- Update company

These endpoints require authentication.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.api.deps import get_current_user

from app.schemas.company import (
    CompanyCreate,
    CompanyUpdate,
    CompanyResponse,
)

from app.services.company_service import (
    create_company,
    list_my_companies,
    get_my_company,
    update_company,
)


router = APIRouter(
    prefix="/companies",
    tags=["Companies"],
)


@router.post(
    "",
    response_model=CompanyResponse,
)
def create_company_endpoint(
    company_data: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create company.

    Flow:
    1. Authenticated user sends company name
    2. Company is created
    3. Creator automatically becomes admin
    """

    return create_company(
        db=db,
        company_data=company_data,
        current_user=current_user,
    )


@router.get(
    "",
    response_model=list[CompanyResponse],
)
def list_companies_endpoint(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List companies current user belongs to.
    """

    return list_my_companies(
        db=db,
        current_user=current_user,
    )


@router.get(
    "/{company_id}",
    response_model=CompanyResponse,
)
def get_company_endpoint(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get one company by id.

    User must be active member of this company.
    """

    return get_my_company(
        db=db,
        company_id=company_id,
        current_user=current_user,
    )


@router.patch(
    "/{company_id}",
    response_model=CompanyResponse,
)
def update_company_endpoint(
    company_id: int,
    company_data: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update company.

    For MVP:
    only company admin can update company.
    """

    return update_company(
        db=db,
        company_id=company_id,
        company_data=company_data,
        current_user=current_user,
    )