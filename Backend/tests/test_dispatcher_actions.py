import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models import (
    Company,
    CompanyMembership,
    DispatcherAction,
    Load,
    LoadSnapshot,
    SearchBatch,
    Truck,
    TruckSearchSession,
    User,
)
from app.services.dispatcher_action_service import (
    create_dispatcher_action,
    get_action_state_for_session_loads,
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


def create_action_fixture(db):
    company = Company(name="Action Dispatch")
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
    db.add(truck)
    db.commit()
    db.refresh(truck)

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
        deduplication_key="dedupe-key",
        broker_name="Summit Freight",
    )
    db.add_all([session, load])
    db.commit()
    db.refresh(session)
    db.refresh(load)

    snapshot = LoadSnapshot(
        load_id=load.id,
        company_id=company.id,
        truck_search_session_id=session.id,
    )
    db.add(snapshot)
    db.commit()

    return owner, other_dispatcher, session, load


def test_owner_dispatcher_can_store_action_history(db):
    owner, _, session, load = create_action_fixture(db)

    save_action = create_dispatcher_action(
        db=db,
        truck_search_session_id=session.id,
        load_id=load.id,
        action_type="save",
        current_user=owner,
    )
    contacted_action = create_dispatcher_action(
        db=db,
        truck_search_session_id=session.id,
        load_id=load.id,
        action_type="contacted",
        current_user=owner,
    )
    state = get_action_state_for_session_loads(
        db=db,
        truck_search_session_id=session.id,
    )

    assert save_action.action_type == "save"
    assert contacted_action.action_type == "contacted"
    assert state[load.id]["saved"] is False
    assert state[load.id]["contacted"] is True
    assert state[load.id]["active_action_type"] == "contacted"


def test_clear_action_appends_history_and_resets_active_state(db):
    owner, _, session, load = create_action_fixture(db)

    create_dispatcher_action(
        db=db,
        truck_search_session_id=session.id,
        load_id=load.id,
        action_type="favorite",
        current_user=owner,
    )
    clear_action = create_dispatcher_action(
        db=db,
        truck_search_session_id=session.id,
        load_id=load.id,
        action_type="cleared",
        current_user=owner,
    )
    state = get_action_state_for_session_loads(
        db=db,
        truck_search_session_id=session.id,
    )
    actions = db.query(DispatcherAction).filter(
        DispatcherAction.truck_search_session_id == session.id,
        DispatcherAction.load_id == load.id,
    ).all()

    assert clear_action.action_type == "cleared"
    assert len(actions) == 2
    assert state[load.id]["favorite"] is False
    assert state[load.id]["active_action_type"] is None
    assert state[load.id]["latest_action_type"] == "cleared"


def test_non_owner_dispatcher_cannot_act_on_search_result(db):
    _, other_dispatcher, session, load = create_action_fixture(db)

    with pytest.raises(Exception) as exc_info:
        create_dispatcher_action(
            db=db,
            truck_search_session_id=session.id,
            load_id=load.id,
            action_type="reject",
            current_user=other_dispatcher,
        )

    assert exc_info.value.status_code == 403
