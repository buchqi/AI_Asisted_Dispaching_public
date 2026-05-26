import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models import (
    Company,
    CompanyMembership,
    Driver,
    Load,
    LoadSnapshot,
    SearchBatch,
    Truck,
    TruckSearchSession,
    User,
)
from app.schemas.booking import BookLoadRequest, BookedLoadUpdate
from app.services.booking_service import (
    book_load,
    list_company_booked_loads,
    update_booked_load,
)


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
    )

    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()

    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def create_booking_fixture(db):
    company = Company(name="Booking Dispatch")
    owner = User(
        email="owner@example.com",
        hashed_password="hashed",
        first_name="Owner",
        last_name="Dispatcher",
        is_active=True,
    )
    other_dispatcher = User(
        email="other@example.com",
        hashed_password="hashed",
        first_name="Other",
        last_name="Dispatcher",
        is_active=True,
    )
    db.add_all([company, owner, other_dispatcher])
    db.commit()
    db.refresh(company)
    db.refresh(owner)
    db.refresh(other_dispatcher)

    db.add_all(
        [
            CompanyMembership(
                user_id=owner.id,
                company_id=company.id,
                role="dispatcher",
                status="active",
            ),
            CompanyMembership(
                user_id=other_dispatcher.id,
                company_id=company.id,
                role="dispatcher",
                status="active",
            ),
        ]
    )
    truck = Truck(
        company_id=company.id,
        truck_id="TRK-101",
        status="available",
    )
    driver = Driver(
        company_id=company.id,
        first_name="Ada",
        last_name="Lovelace",
        status="active",
    )
    db.add_all([truck, driver])
    db.commit()
    db.refresh(truck)
    db.refresh(driver)

    batch = SearchBatch(
        company_id=company.id,
        created_by_user_id=owner.id,
        status="completed",
        total_trucks=1,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    session = TruckSearchSession(
        search_batch_id=batch.id,
        company_id=company.id,
        truck_id=truck.id,
        owner_user_id=owner.id,
        status="completed",
    )
    load = Load(
        company_id=company.id,
        deduplication_key="load-1",
        broker_name="Summit Freight",
        equipment_type="Dry Van",
        origin_city="Dallas",
        origin_state="TX",
        destination_city="Atlanta",
        destination_state="GA",
    )
    db.add_all([session, load])
    db.commit()
    db.refresh(session)
    db.refresh(load)

    snapshot = LoadSnapshot(
        load_id=load.id,
        company_id=company.id,
        truck_search_session_id=session.id,
        posted_rate=2500,
        miles=800,
        weight=30000,
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)

    return company, owner, other_dispatcher, truck, driver, load, snapshot


def test_owner_can_book_load_and_fields_are_copied(db):
    company, owner, _, truck, driver, load, snapshot = create_booking_fixture(db)

    booking = book_load(
        db=db,
        load_id=load.id,
        data=BookLoadRequest(
            truck_id=truck.id,
            driver_id=driver.id,
            load_snapshot_id=snapshot.id,
            notes="Broker confirmed the rate.",
        ),
        current_user=owner,
    )

    assert booking.company_id == company.id
    assert booking.dispatcher_user_id == owner.id
    assert booking.truck_id == truck.id
    assert booking.driver_id == driver.id
    assert booking.broker_name == "Summit Freight"
    assert booking.posted_rate == 2500
    assert booking.final_rate == 2500
    assert booking.status == "booked"


def test_duplicate_active_booking_is_rejected(db):
    _, owner, _, truck, _, load, snapshot = create_booking_fixture(db)

    book_load(
        db=db,
        load_id=load.id,
        data=BookLoadRequest(
            truck_id=truck.id,
            load_snapshot_id=snapshot.id,
        ),
        current_user=owner,
    )

    with pytest.raises(Exception) as exc_info:
        book_load(
            db=db,
            load_id=load.id,
            data=BookLoadRequest(
                truck_id=truck.id,
                load_snapshot_id=snapshot.id,
            ),
            current_user=owner,
        )

    assert exc_info.value.status_code == 400


def test_non_owner_cannot_book_search_snapshot(db):
    _, _, other_dispatcher, truck, _, load, snapshot = create_booking_fixture(db)

    with pytest.raises(Exception) as exc_info:
        book_load(
            db=db,
            load_id=load.id,
            data=BookLoadRequest(
                truck_id=truck.id,
                load_snapshot_id=snapshot.id,
            ),
            current_user=other_dispatcher,
        )

    assert exc_info.value.status_code == 403


def test_company_member_can_update_booking_status(db):
    company, owner, other_dispatcher, truck, _, load, snapshot = (
        create_booking_fixture(db)
    )
    booking = book_load(
        db=db,
        load_id=load.id,
        data=BookLoadRequest(
            truck_id=truck.id,
            load_snapshot_id=snapshot.id,
        ),
        current_user=owner,
    )

    updated = update_booked_load(
        db=db,
        booked_load_id=booking.id,
        data=BookedLoadUpdate(status="picked_up"),
        current_user=other_dispatcher,
    )
    bookings = list_company_booked_loads(
        db=db,
        company_id=company.id,
        current_user=owner,
    )

    assert updated.status == "picked_up"
    assert len(bookings) == 1
