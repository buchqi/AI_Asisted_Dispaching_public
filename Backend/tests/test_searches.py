import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models import (
    Company,
    CompanyMembership,
    LoadBoardSession,
    Load,
    LoadSnapshot,
    LoadSource,
    Truck,
    TruckSearchSession,
    User,
    WorkerLog,
)
from app.schemas.search import SearchStartRequest
from app.services.load_service import store_raw_load_results
from app.services.search_service import start_search_batch
from app.workers.mock_search_worker import MockSearchWorker
from app.workers.worker_manager import WorkerManager


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


def create_company_user_and_trucks(db):
    company = Company(name="Test Dispatch")
    other_company = Company(name="Other Dispatch")
    user = User(
        email="dispatcher@example.com",
        hashed_password="hashed",
        first_name="Test",
        last_name="Dispatcher",
        is_active=True,
    )
    non_member = User(
        email="outsider@example.com",
        hashed_password="hashed",
        first_name="Outside",
        last_name="User",
        is_active=True,
    )

    db.add_all([company, other_company, user, non_member])
    db.commit()
    db.refresh(company)
    db.refresh(other_company)
    db.refresh(user)
    db.refresh(non_member)

    membership = CompanyMembership(
        user_id=user.id,
        company_id=company.id,
        role="dispatcher",
        status="active",
    )
    truck_one = Truck(
        company_id=company.id,
        truck_id="TRK-101",
        status="available",
        equipment_type="Dry Van",
    )
    truck_two = Truck(
        company_id=company.id,
        truck_id="TRK-102",
        status="available",
        equipment_type="Reefer",
    )
    other_truck = Truck(
        company_id=other_company.id,
        truck_id="TRK-999",
        status="available",
    )
    board = LoadBoardSession(
        company_id=company.id,
        board_name="DAT",
        status="active",
        health_status="healthy",
    )

    db.add_all([membership, truck_one, truck_two, other_truck, board])
    db.commit()

    return company, user, non_member, truck_one, truck_two, other_truck


def test_start_search_batch_runs_mock_workers(db):
    company, user, _, truck_one, truck_two, _ = create_company_user_and_trucks(db)

    batch = start_search_batch(
        db=db,
        current_user=user,
        data=SearchStartRequest(
            company_id=company.id,
            truck_ids=[truck_one.id, truck_two.id],
            filters={"equipment_type": "Dry Van"},
            timeout_seconds=30,
        ),
    )
    batch = WorkerManager(db=db).run_search_batch(batch)

    assert batch.status == "completed"
    assert batch.total_trucks == 2
    assert batch.completed_trucks == 2
    assert batch.failed_trucks == 0
    assert batch.completed_at is not None

    sessions = (
        db.query(TruckSearchSession)
        .filter(TruckSearchSession.search_batch_id == batch.id)
        .all()
    )

    assert len(sessions) == 2
    assert {session.status for session in sessions} == {"completed"}
    assert all(session.started_at is not None for session in sessions)
    assert all(session.completed_at is not None for session in sessions)

    logs = db.query(WorkerLog).all()

    assert len(logs) >= 8
    assert {
        log.metadata_json["event"]
        for log in logs
        if log.metadata_json and "event" in log.metadata_json
    } >= {
        "worker.started",
        "load_board.connected",
        "loads.found",
        "worker.completed",
    }

    load_log = next(
        log
        for log in logs
        if log.metadata_json and log.metadata_json.get("event") == "loads.found"
    )
    assert load_log.metadata_json["count"] == 5
    assert len(load_log.metadata_json["load_snapshot_ids"]) == 5
    assert db.query(Load).count() >= 1
    assert db.query(LoadSnapshot).count() == 10
    assert db.query(LoadSource).count() == 10


def test_start_search_rejects_truck_from_another_company(db):
    company, user, _, truck_one, _, other_truck = create_company_user_and_trucks(db)

    with pytest.raises(Exception) as exc_info:
        start_search_batch(
            db=db,
            current_user=user,
            data=SearchStartRequest(
                company_id=company.id,
                truck_ids=[truck_one.id, other_truck.id],
            ),
        )

    assert exc_info.value.status_code == 400


def test_start_search_requires_company_membership(db):
    company, _, non_member, truck_one, _, _ = create_company_user_and_trucks(db)

    with pytest.raises(Exception) as exc_info:
        start_search_batch(
            db=db,
            current_user=non_member,
            data=SearchStartRequest(
                company_id=company.id,
                truck_ids=[truck_one.id],
            ),
        )

    assert exc_info.value.status_code == 403


def test_failed_mock_worker_marks_session_and_batch_failed(db, monkeypatch):
    company, user, _, truck_one, _, _ = create_company_user_and_trucks(db)

    def fail_load_generation(self, session, boards):
        raise RuntimeError("Mock failure")

    monkeypatch.setattr(
        MockSearchWorker,
        "_generate_mock_loads",
        fail_load_generation,
    )

    batch = start_search_batch(
        db=db,
        current_user=user,
        data=SearchStartRequest(
            company_id=company.id,
            truck_ids=[truck_one.id],
        ),
    )
    batch = WorkerManager(db=db).run_search_batch(batch)

    session = (
        db.query(TruckSearchSession)
        .filter(TruckSearchSession.search_batch_id == batch.id)
        .first()
    )
    error_log = (
        db.query(WorkerLog)
        .filter(
            WorkerLog.truck_search_session_id == session.id,
            WorkerLog.level == "error",
        )
        .first()
    )

    assert batch.status == "failed"
    assert batch.completed_trucks == 0
    assert batch.failed_trucks == 1
    assert session.status == "failed"
    assert session.error_message == "Mock failure"
    assert error_log is not None
    assert error_log.metadata_json["event"] == "worker.failed"


def test_duplicate_raw_loads_share_one_load_with_multiple_snapshots(db):
    company, user, _, truck_one, _, _ = create_company_user_and_trucks(db)
    raw_load = {
        "broker_name": "Summit Freight",
        "equipment_type": "Dry Van",
        "origin_city": "Dallas",
        "origin_state": "TX",
        "destination_city": "Atlanta",
        "destination_state": "GA",
        "pickup_date": "2026-05-22",
        "delivery_date": "2026-05-24",
        "rate": 2500,
        "miles": 780,
        "weight": 32000,
        "load_board_name": "DAT",
        "external_load_id": "DAT-1",
    }
    batch = start_search_batch(
        db=db,
        current_user=user,
        data=SearchStartRequest(
            company_id=company.id,
            truck_ids=[truck_one.id],
        ),
    )
    batch = WorkerManager(db=db).run_search_batch(batch)
    session = (
        db.query(TruckSearchSession)
        .filter(TruckSearchSession.search_batch_id == batch.id)
        .first()
    )

    before_load_count = db.query(Load).count()
    store_raw_load_results(
        db=db,
        company_id=company.id,
        truck_search_session_id=session.id,
        raw_loads=[
            raw_load,
            {
                **raw_load,
                "load_board_name": "TruckStop",
                "external_load_id": "TS-1",
            },
        ],
    )

    assert db.query(Load).count() == before_load_count + 1

    duplicate_load = (
        db.query(Load)
        .filter(Load.broker_name == "Summit Freight")
        .first()
    )
    snapshots = (
        db.query(LoadSnapshot)
        .filter(LoadSnapshot.load_id == duplicate_load.id)
        .all()
    )
    sources = (
        db.query(LoadSource)
        .filter(LoadSource.load_id == duplicate_load.id)
        .all()
    )

    assert len(snapshots) == 2
    assert len(sources) == 2
    assert {source.load_board_name for source in sources} == {
        "DAT",
        "TruckStop",
    }
