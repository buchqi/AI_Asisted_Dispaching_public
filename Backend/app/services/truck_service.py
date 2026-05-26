"""
Truck service.

Purpose:
- Create trucks
- List company trucks
- Update truck information
- Deactivate trucks
- Assign/unassign drivers
- Maintain current driver display fields

Important:
Truck belongs to company.
Company access checks are required.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.truck import Truck
from app.models.driver import Driver
from app.models.user import User

from app.schemas.truck import (
    TruckCreate,
    TruckUpdate,
)

from app.core.permissions import (
    require_company_member,
)

from app.services.membership_service import (
    require_company_admin,
)


def create_truck(
    db: Session,
    company_id: int,
    truck_data: TruckCreate,
    current_user: User,
) -> Truck:
    """
    Create a new truck.

    Important:
    truck_id must be unique inside one company.
    """

    require_company_member(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    existing_truck = (
        db.query(Truck)
        .filter(
            Truck.company_id == company_id,
            Truck.truck_id == truck_data.truck_id,
        )
        .first()
    )

    if existing_truck:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Truck number already exists in this company",
        )

    new_truck = Truck(
        company_id=company_id,
        truck_id=truck_data.truck_id,
        equipment_type=truck_data.equipment_type,
        status=truck_data.status,
        notes=truck_data.notes,
    )

    """
    Optional driver assignment during truck creation.
    """

    if truck_data.current_driver_id is not None:

        driver = (
            db.query(Driver)
            .filter(
                Driver.id == truck_data.current_driver_id,
                Driver.company_id == company_id,
            )
            .first()
        )

        if not driver:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Driver not found",
            )

        new_truck.current_driver_id = driver.id
        new_truck.current_driver_name = driver.first_name
        new_truck.current_driver_surname = driver.last_name

    db.add(new_truck)
    db.commit()
    db.refresh(new_truck)

    return new_truck


def list_company_trucks(
    db: Session,
    company_id: int,
    current_user: User,
) -> list[Truck]:
    """
    List all trucks inside company.
    """

    require_company_member(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    return (
        db.query(Truck)
        .filter(Truck.company_id == company_id)
        .all()
    )


def get_truck_by_id(
    db: Session,
    company_id: int,
    truck_id: int,
    current_user: User,
) -> Truck:
    """
    Get one truck by database id.

    Ensures:
    - user belongs to company
    - truck belongs to company
    """

    require_company_member(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    truck = (
        db.query(Truck)
        .filter(
            Truck.id == truck_id,
            Truck.company_id == company_id,
        )
        .first()
    )

    if not truck:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Truck not found",
        )

    return truck


def update_truck(
    db: Session,
    company_id: int,
    truck_id: int,
    truck_data: TruckUpdate,
    current_user: User,
) -> Truck:
    """
    Update truck information.

    Supports:
    - truck number
    - status
    - equipment type
    - notes
    """

    require_company_member(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    truck = get_truck_by_id(
        db=db,
        company_id=company_id,
        truck_id=truck_id,
        current_user=current_user,
    )

    update_data = truck_data.model_dump(
        exclude_unset=True
    )

    """
    Validate unique truck_id inside company.
    """

    if "truck_id" in update_data:

        existing_truck = (
            db.query(Truck)
            .filter(
                Truck.company_id == company_id,
                Truck.truck_id == update_data["truck_id"],
                Truck.id != truck.id,
            )
            .first()
        )

        if existing_truck:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Truck number already exists in this company",
            )

    """
    Update normal fields.
    """

    for field, value in update_data.items():
        setattr(truck, field, value)

    db.commit()
    db.refresh(truck)

    return truck


def deactivate_truck(
    db: Session,
    company_id: int,
    truck_id: int,
    current_user: User,
) -> Truck:
    """
    Deactivate truck instead of deleting.

    Preserves:
    - load history
    - search history
    - booked loads
    """

    require_company_admin(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    truck = get_truck_by_id(
        db=db,
        company_id=company_id,
        truck_id=truck_id,
        current_user=current_user,
    )

    truck.status = "inactive"

    db.commit()
    db.refresh(truck)

    return truck


def assign_driver_to_truck(
    db: Session,
    company_id: int,
    truck_id: int,
    driver_id: int | None,
    current_user: User,
) -> Truck:
    """
    Assign or unassign driver to truck.

    driver_id = None means:
    remove current assignment.
    """

    require_company_member(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    truck = get_truck_by_id(
        db=db,
        company_id=company_id,
        truck_id=truck_id,
        current_user=current_user,
    )

    """
    Unassign driver.
    """

    if driver_id is None:

        truck.current_driver_id = None
        truck.current_driver_name = None
        truck.current_driver_surname = None

        db.commit()
        db.refresh(truck)

        return truck

    """
    Assign driver.
    """

    driver = (
        db.query(Driver)
        .filter(
            Driver.id == driver_id,
            Driver.company_id == company_id,
        )
        .first()
    )

    if not driver:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Driver not found",
        )

    truck.current_driver_id = driver.id
    truck.current_driver_name = driver.first_name
    truck.current_driver_surname = driver.last_name

    db.commit()
    db.refresh(truck)

    return truck