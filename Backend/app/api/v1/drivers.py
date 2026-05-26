"""
Driver API endpoints.

Purpose:
- Create drivers
- List company drivers
- Get one driver
- Update driver
- Deactivate driver

All endpoints require authentication.
Company membership is checked inside the service layer.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User

from app.schemas.driver import (
    DriverCreate,
    DriverUpdate,
    DriverResponse,
)

from app.services.driver_service import (
    create_driver,
    list_company_drivers,
    get_driver_by_id,
    update_driver,
    deactivate_driver,
)


router = APIRouter(
    tags=["Drivers"],
)


@router.post(
    "/companies/{company_id}/drivers",
    response_model=DriverResponse,
)
def create_driver_endpoint(
    company_id: int,
    driver_data: DriverCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new driver inside company.
    """

    return create_driver(
        db=db,
        company_id=company_id,
        driver_data=driver_data,
        current_user=current_user,
    )


@router.get(
    "/companies/{company_id}/drivers",
    response_model=list[DriverResponse],
)
def list_company_drivers_endpoint(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all drivers in company.
    """

    return list_company_drivers(
        db=db,
        company_id=company_id,
        current_user=current_user,
    )


@router.get(
    "/companies/{company_id}/drivers/{driver_id}",
    response_model=DriverResponse,
)
def get_driver_endpoint(
    company_id: int,
    driver_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get one driver by id.
    """

    return get_driver_by_id(
        db=db,
        company_id=company_id,
        driver_id=driver_id,
        current_user=current_user,
    )


@router.patch(
    "/companies/{company_id}/drivers/{driver_id}",
    response_model=DriverResponse,
)
def update_driver_endpoint(
    company_id: int,
    driver_id: int,
    driver_data: DriverUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update driver information.
    """

    return update_driver(
        db=db,
        company_id=company_id,
        driver_id=driver_id,
        driver_data=driver_data,
        current_user=current_user,
    )


@router.delete(
    "/companies/{company_id}/drivers/{driver_id}",
    response_model=DriverResponse,
)
def deactivate_driver_endpoint(
    company_id: int,
    driver_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Deactivate driver instead of deleting row.
    """

    return deactivate_driver(
        db=db,
        company_id=company_id,
        driver_id=driver_id,
        current_user=current_user,
    )