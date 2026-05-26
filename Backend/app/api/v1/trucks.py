"""
Truck API endpoints.

Purpose:
- Create trucks
- List company trucks
- Get one truck
- Update truck
- Deactivate truck
- Assign/unassign driver to truck

All endpoints require authentication.
Company membership is checked inside service layer.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User

from app.schemas.truck import (
    TruckCreate,
    TruckUpdate,
    AssignDriverRequest,
    TruckResponse,
)

from app.services.truck_service import (
    create_truck,
    list_company_trucks,
    get_truck_by_id,
    update_truck,
    deactivate_truck,
    assign_driver_to_truck,
)


router = APIRouter(
    tags=["Trucks"],
)


@router.post(
    "/companies/{company_id}/trucks",
    response_model=TruckResponse,
)
def create_truck_endpoint(
    company_id: int,
    truck_data: TruckCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new truck inside company.

    truck_id means internal company truck number,
    not database id.
    """

    return create_truck(
        db=db,
        company_id=company_id,
        truck_data=truck_data,
        current_user=current_user,
    )


@router.get(
    "/companies/{company_id}/trucks",
    response_model=list[TruckResponse],
)
def list_company_trucks_endpoint(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all trucks in company.
    """

    return list_company_trucks(
        db=db,
        company_id=company_id,
        current_user=current_user,
    )


@router.get(
    "/companies/{company_id}/trucks/{truck_id}",
    response_model=TruckResponse,
)
def get_truck_endpoint(
    company_id: int,
    truck_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get one truck by database id.
    """

    return get_truck_by_id(
        db=db,
        company_id=company_id,
        truck_id=truck_id,
        current_user=current_user,
    )


@router.patch(
    "/companies/{company_id}/trucks/{truck_id}",
    response_model=TruckResponse,
)
def update_truck_endpoint(
    company_id: int,
    truck_id: int,
    truck_data: TruckUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update truck information.
    """

    return update_truck(
        db=db,
        company_id=company_id,
        truck_id=truck_id,
        truck_data=truck_data,
        current_user=current_user,
    )


@router.delete(
    "/companies/{company_id}/trucks/{truck_id}",
    response_model=TruckResponse,
)
def deactivate_truck_endpoint(
    company_id: int,
    truck_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Deactivate truck instead of deleting row.
    """

    return deactivate_truck(
        db=db,
        company_id=company_id,
        truck_id=truck_id,
        current_user=current_user,
    )


@router.post(
    "/companies/{company_id}/trucks/{truck_id}/assign-driver",
    response_model=TruckResponse,
)
def assign_driver_to_truck_endpoint(
    company_id: int,
    truck_id: int,
    assign_data: AssignDriverRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Assign or unassign driver to truck.

    assign_data.driver_id = integer:
        assign driver

    assign_data.driver_id = null:
        unassign current driver
    """

    return assign_driver_to_truck(
        db=db,
        company_id=company_id,
        truck_id=truck_id,
        driver_id=assign_data.driver_id,
        current_user=current_user,
    )