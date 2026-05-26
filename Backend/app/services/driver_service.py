"""
Driver service.

Purpose:
- Create drivers
- List company drivers
- Update driver information
- Deactivate drivers
- Assign driver to truck

Important:
Drivers belong to companies.
Company access checks are required.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.driver import Driver
from app.models.truck import Truck
from app.models.user import User

from app.schemas.driver import (
    DriverCreate,
    DriverUpdate,
)

from app.core.permissions import (
    require_company_member,
)

from app.services.membership_service import (
    require_company_admin,
)


def create_driver(
    db: Session,
    company_id: int,
    driver_data: DriverCreate,
    current_user: User,
) -> Driver:
    """
    Create a new driver.

    Only company members can create drivers.
    """

    require_company_member(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    new_driver = Driver(
        company_id=company_id,
        first_name=driver_data.first_name,
        last_name=driver_data.last_name,
        phone=driver_data.phone,
        email=driver_data.email,
        home_location=driver_data.home_location,
        preferences=driver_data.preferences,
        notes=driver_data.notes,
        status="active",
    )

    db.add(new_driver)
    db.commit()
    db.refresh(new_driver)

    return new_driver


def list_company_drivers(
    db: Session,
    company_id: int,
    current_user: User,
) -> list[Driver]:
    """
    List all company drivers.

    Only company members can access this endpoint.
    """

    require_company_member(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    return (
        db.query(Driver)
        .filter(Driver.company_id == company_id)
        .all()
    )


def get_driver_by_id(
    db: Session,
    company_id: int,
    driver_id: int,
    current_user: User,
) -> Driver:
    """
    Get one driver by id.

    Ensures:
    - user belongs to company
    - driver belongs to company
    """

    require_company_member(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

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

    return driver


def update_driver(
    db: Session,
    company_id: int,
    driver_id: int,
    driver_data: DriverUpdate,
    current_user: User,
) -> Driver:
    """
    Update driver information.
    """

    require_company_member(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    driver = get_driver_by_id(
        db=db,
        company_id=company_id,
        driver_id=driver_id,
        current_user=current_user,
    )

    # Update only provided fields
    for field, value in driver_data.model_dump(
        exclude_unset=True
    ).items():
        setattr(driver, field, value)

    db.commit()
    db.refresh(driver)

    return driver


def deactivate_driver(
    db: Session,
    company_id: int,
    driver_id: int,
    current_user: User,
) -> Driver:
    """
    Deactivate driver instead of deleting.

    This preserves:
    - search history
    - booked load history
    - assignment history
    """

    require_company_admin(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    driver = get_driver_by_id(
        db=db,
        company_id=company_id,
        driver_id=driver_id,
        current_user=current_user,
    )

    driver.status = "inactive"

    db.commit()
    db.refresh(driver)

    return driver


def assign_driver_to_truck(
    db: Session,
    company_id: int,
    driver_id: int,
    truck_id: int,
    current_user: User,
) -> Truck:
    """
    Assign or reassign driver to truck.

    Important:
    Truck stores driver display fields directly for fast UI rendering.

    So when assignment changes:
    - truck.current_driver_id changes
    - truck.current_driver_name changes
    - truck.current_driver_surname changes
    """

    require_company_member(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    driver = get_driver_by_id(
        db=db,
        company_id=company_id,
        driver_id=driver_id,
        current_user=current_user,
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

    truck.current_driver_id = driver.id
    truck.current_driver_name = driver.first_name
    truck.current_driver_surname = driver.last_name

    db.commit()
    db.refresh(truck)

    return truck