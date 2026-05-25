"""
Booked load service.

This service stores booking history for selected loads. It does not handle
payments, invoices, documents, scoring, or real load-board automation.
"""

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.permissions import require_truck_search_session_owner
from app.models.booked_load import BookedLoad
from app.models.driver import Driver
from app.models.load import Load
from app.models.load_snapshot import LoadSnapshot
from app.models.truck import Truck
from app.models.user import User
from app.schemas.booking import BookLoadRequest, BookedLoadUpdate
from app.services.membership_service import require_company_member


ACTIVE_BOOKING_STATUSES = ["booked", "picked_up"]


def get_latest_snapshot_for_load(
    db: Session,
    *,
    load_id: int,
    company_id: int,
) -> LoadSnapshot | None:
    """
    Return the newest snapshot for a load inside a company.
    """

    return (
        db.query(LoadSnapshot)
        .filter(
            LoadSnapshot.load_id == load_id,
            LoadSnapshot.company_id == company_id,
        )
        .order_by(LoadSnapshot.id.desc())
        .first()
    )


def validate_load_snapshot(
    db: Session,
    *,
    load: Load,
    load_snapshot_id: int | None,
) -> LoadSnapshot | None:
    """
    Validate the requested snapshot or fall back to the latest one.
    """

    if load_snapshot_id is None:
        return get_latest_snapshot_for_load(
            db=db,
            load_id=load.id,
            company_id=load.company_id,
        )

    snapshot = (
        db.query(LoadSnapshot)
        .filter(LoadSnapshot.id == load_snapshot_id)
        .first()
    )

    if not snapshot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Load snapshot not found.",
        )

    if snapshot.load_id != load.id or snapshot.company_id != load.company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Load snapshot does not belong to this load.",
        )

    return snapshot


def validate_truck(
    db: Session,
    *,
    truck_id: int,
    company_id: int,
) -> Truck:
    """
    Ensure the truck exists inside the booking company.
    """

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
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Truck does not belong to this company.",
        )

    return truck


def validate_driver(
    db: Session,
    *,
    driver_id: int | None,
    company_id: int,
) -> Driver | None:
    """
    Ensure the optional driver exists inside the booking company.
    """

    if driver_id is None:
        return None

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
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Driver does not belong to this company.",
        )

    return driver


def prevent_duplicate_active_booking(
    db: Session,
    *,
    company_id: int,
    load_id: int,
) -> None:
    """
    Prevent booking the same load while it is already active.
    """

    existing_booking = (
        db.query(BookedLoad)
        .filter(
            BookedLoad.company_id == company_id,
            BookedLoad.load_id == load_id,
            BookedLoad.status.in_(ACTIVE_BOOKING_STATUSES),
        )
        .first()
    )

    if existing_booking:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Load is already actively booked.",
        )


def book_load(
    db: Session,
    *,
    load_id: int,
    data: BookLoadRequest,
    current_user: User,
) -> BookedLoad:
    """
    Book a selected load and copy booking-time fields.
    """

    load = (
        db.query(Load)
        .filter(Load.id == load_id)
        .first()
    )

    if not load:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Load not found.",
        )

    require_company_member(
        db=db,
        current_user=current_user,
        company_id=load.company_id,
    )

    snapshot = validate_load_snapshot(
        db=db,
        load=load,
        load_snapshot_id=data.load_snapshot_id,
    )

    truck_search_session_id = (
        snapshot.truck_search_session_id
        if snapshot is not None
        else None
    )

    if truck_search_session_id is not None:
        require_truck_search_session_owner(
            db=db,
            current_user=current_user,
            truck_search_session_id=truck_search_session_id,
        )

    validate_truck(
        db=db,
        truck_id=data.truck_id,
        company_id=load.company_id,
    )
    validate_driver(
        db=db,
        driver_id=data.driver_id,
        company_id=load.company_id,
    )
    prevent_duplicate_active_booking(
        db=db,
        company_id=load.company_id,
        load_id=load.id,
    )

    posted_rate = snapshot.posted_rate if snapshot is not None else None
    final_rate = data.final_rate if data.final_rate is not None else posted_rate

    booked_load = BookedLoad(
        company_id=load.company_id,
        load_id=load.id,
        load_snapshot_id=snapshot.id if snapshot is not None else None,
        truck_search_session_id=truck_search_session_id,
        truck_id=data.truck_id,
        driver_id=data.driver_id,
        dispatcher_user_id=current_user.id,
        broker_name=load.broker_name,
        equipment_type=load.equipment_type,
        origin_city=load.origin_city,
        origin_state=load.origin_state,
        destination_city=load.destination_city,
        destination_state=load.destination_state,
        pickup_date=(
            snapshot.pickup_date
            if snapshot is not None and snapshot.pickup_date is not None
            else load.pickup_date
        ),
        delivery_date=(
            snapshot.delivery_date
            if snapshot is not None and snapshot.delivery_date is not None
            else load.delivery_date
        ),
        posted_rate=posted_rate,
        final_rate=final_rate,
        miles=snapshot.miles if snapshot is not None else None,
        weight=snapshot.weight if snapshot is not None else None,
        status="booked",
        notes=data.notes,
    )

    db.add(booked_load)
    db.commit()
    db.refresh(booked_load)

    return booked_load


def list_company_booked_loads(
    db: Session,
    *,
    company_id: int,
    current_user: User,
) -> list[BookedLoad]:
    """
    Return company booked loads newest first.
    """

    require_company_member(
        db=db,
        current_user=current_user,
        company_id=company_id,
    )

    return (
        db.query(BookedLoad)
        .filter(BookedLoad.company_id == company_id)
        .order_by(BookedLoad.id.desc())
        .all()
    )


def get_booked_load(
    db: Session,
    *,
    booked_load_id: int,
    current_user: User,
) -> BookedLoad:
    """
    Return one booked load after company access check.
    """

    booked_load = (
        db.query(BookedLoad)
        .filter(BookedLoad.id == booked_load_id)
        .first()
    )

    if not booked_load:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booked load not found.",
        )

    require_company_member(
        db=db,
        current_user=current_user,
        company_id=booked_load.company_id,
    )

    return booked_load


def update_booked_load(
    db: Session,
    *,
    booked_load_id: int,
    data: BookedLoadUpdate,
    current_user: User,
) -> BookedLoad:
    """
    Update booking status, final rate, or notes.
    """

    booked_load = get_booked_load(
        db=db,
        booked_load_id=booked_load_id,
        current_user=current_user,
    )
    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(booked_load, field, value)

    db.add(booked_load)
    db.commit()
    db.refresh(booked_load)

    return booked_load
