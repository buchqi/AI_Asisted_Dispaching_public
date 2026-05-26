"""
Booked load API endpoints.

Phase 13 stores booking history for selected loads.
Payments, invoicing, documents, scoring, and frontend workflows are out of scope.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.booking import (
    BookLoadRequest,
    BookedLoadResponse,
    BookedLoadUpdate,
)
from app.services.booking_service import (
    book_load,
    get_booked_load,
    list_company_booked_loads,
    update_booked_load,
)


router = APIRouter(
    tags=["Bookings"],
)


@router.post(
    "/loads/{load_id}/book",
    response_model=BookedLoadResponse,
)
def book_load_endpoint(
    load_id: int,
    data: BookLoadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Book a selected load.
    """

    return book_load(
        db=db,
        load_id=load_id,
        data=data,
        current_user=current_user,
    )


@router.get(
    "/companies/{company_id}/booked-loads",
    response_model=list[BookedLoadResponse],
)
def list_company_booked_loads_endpoint(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List booked load history for a company.
    """

    return list_company_booked_loads(
        db=db,
        company_id=company_id,
        current_user=current_user,
    )


@router.get(
    "/booked-loads/{booked_load_id}",
    response_model=BookedLoadResponse,
)
def get_booked_load_endpoint(
    booked_load_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get booked load details.
    """

    return get_booked_load(
        db=db,
        booked_load_id=booked_load_id,
        current_user=current_user,
    )


@router.patch(
    "/booked-loads/{booked_load_id}",
    response_model=BookedLoadResponse,
)
def update_booked_load_endpoint(
    booked_load_id: int,
    data: BookedLoadUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update booked load status, final rate, or notes.
    """

    return update_booked_load(
        db=db,
        booked_load_id=booked_load_id,
        data=data,
        current_user=current_user,
    )
