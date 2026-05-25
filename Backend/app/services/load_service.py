"""
Load result service.

Stores stable loads, search-time snapshots, and load-board source records
created by mock searches. Real browser automation and final normalization
belong to later phases.
"""

from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.models.load import Load
from app.models.load_snapshot import LoadSnapshot
from app.models.load_source import LoadSource
from app.utils.deduplication import build_load_deduplication_key


def parse_optional_datetime(value: Any) -> datetime | None:
    """
    Parse a date/datetime-like value from mock raw load data.
    """

    if value is None:
        return None

    if isinstance(value, datetime):
        return value

    if isinstance(value, str):
        return datetime.fromisoformat(value)

    return None


def get_optional_float(raw_load: dict, *keys: str) -> float | None:
    for key in keys:
        value = raw_load.get(key)

        if value is not None:
            return float(value)

    return None


def get_optional_int(raw_load: dict, key: str) -> int | None:
    value = raw_load.get(key)

    if value is None:
        return None

    return int(value)


def get_or_create_load_from_raw(
    db: Session,
    *,
    company_id: int,
    raw_load: dict,
) -> Load:
    """
    Return the stable Load matching the raw load, creating it if needed.
    """

    deduplication_key = build_load_deduplication_key(raw_load)

    existing_load = (
        db.query(Load)
        .filter(
            Load.company_id == company_id,
            Load.deduplication_key == deduplication_key,
        )
        .first()
    )

    if existing_load:
        return existing_load

    load = Load(
        company_id=company_id,
        deduplication_key=deduplication_key,
        broker_name=raw_load.get("broker_name"),
        equipment_type=raw_load.get("equipment_type"),
        origin_city=raw_load.get("origin_city"),
        origin_state=raw_load.get("origin_state"),
        destination_city=raw_load.get("destination_city"),
        destination_state=raw_load.get("destination_state"),
        pickup_date=parse_optional_datetime(raw_load.get("pickup_date")),
        delivery_date=parse_optional_datetime(raw_load.get("delivery_date")),
    )

    db.add(load)
    db.flush()

    return load


def create_load_snapshot(
    db: Session,
    *,
    load: Load,
    company_id: int,
    truck_search_session_id: int,
    raw_load: dict,
) -> LoadSnapshot:
    """
    Store changing search-time load data for one observation.
    """

    snapshot = LoadSnapshot(
        load_id=load.id,
        company_id=company_id,
        truck_search_session_id=truck_search_session_id,
        posted_rate=get_optional_float(raw_load, "posted_rate", "rate"),
        miles=get_optional_int(raw_load, "miles"),
        weight=get_optional_int(raw_load, "weight"),
        pickup_date=parse_optional_datetime(raw_load.get("pickup_date")),
        delivery_date=parse_optional_datetime(raw_load.get("delivery_date")),
        raw_payload=raw_load,
    )

    db.add(snapshot)
    db.flush()

    return snapshot


def create_load_source(
    db: Session,
    *,
    load: Load,
    snapshot: LoadSnapshot,
    company_id: int,
    truck_search_session_id: int,
    raw_load: dict,
) -> LoadSource:
    """
    Store the board/source details that produced one load snapshot.
    """

    source = LoadSource(
        load_id=load.id,
        load_snapshot_id=snapshot.id,
        company_id=company_id,
        truck_search_session_id=truck_search_session_id,
        load_board_name=(
            raw_load.get("load_board_name")
            or raw_load.get("load_board")
            or "unknown"
        ),
        external_load_id=raw_load.get("external_load_id"),
        source_url=raw_load.get("source_url"),
        contact_email=raw_load.get("contact_email"),
        contact_phone=raw_load.get("contact_phone"),
    )

    db.add(source)
    db.flush()

    return source


def store_raw_load_result(
    db: Session,
    *,
    company_id: int,
    truck_search_session_id: int,
    raw_load: dict,
) -> LoadSnapshot:
    """
    Store one raw load result as Load, LoadSnapshot, and LoadSource rows.
    """

    load = get_or_create_load_from_raw(
        db=db,
        company_id=company_id,
        raw_load=raw_load,
    )
    snapshot = create_load_snapshot(
        db=db,
        load=load,
        company_id=company_id,
        truck_search_session_id=truck_search_session_id,
        raw_load=raw_load,
    )
    create_load_source(
        db=db,
        load=load,
        snapshot=snapshot,
        company_id=company_id,
        truck_search_session_id=truck_search_session_id,
        raw_load=raw_load,
    )

    db.commit()
    db.refresh(snapshot)

    return snapshot


def store_raw_load_results(
    db: Session,
    *,
    company_id: int,
    truck_search_session_id: int,
    raw_loads: list[dict],
) -> list[LoadSnapshot]:
    """
    Store multiple raw load results.

    Each raw result creates a new LoadSnapshot, while Load records are
    deduplicated by company and deduplication key.
    """

    snapshots = []

    for raw_load in raw_loads:
        load = get_or_create_load_from_raw(
            db=db,
            company_id=company_id,
            raw_load=raw_load,
        )
        snapshot = create_load_snapshot(
            db=db,
            load=load,
            company_id=company_id,
            truck_search_session_id=truck_search_session_id,
            raw_load=raw_load,
        )
        create_load_source(
            db=db,
            load=load,
            snapshot=snapshot,
            company_id=company_id,
            truck_search_session_id=truck_search_session_id,
            raw_load=raw_load,
        )
        snapshots.append(snapshot)

    db.commit()

    for snapshot in snapshots:
        db.refresh(snapshot)

    return snapshots


def list_loads_for_truck_search_session(
    db: Session,
    *,
    truck_search_session_id: int,
) -> list[LoadSnapshot]:
    """
    Return load snapshots for one truck search session.
    """

    return (
        db.query(LoadSnapshot)
        .options(
            joinedload(LoadSnapshot.load),
            joinedload(LoadSnapshot.sources),
        )
        .filter(
            LoadSnapshot.truck_search_session_id == truck_search_session_id
        )
        .order_by(LoadSnapshot.id.asc())
        .all()
    )


def get_load_by_id(
    db: Session,
    *,
    load_id: int,
) -> Load | None:
    """
    Return one stable Load by id.
    """

    return (
        db.query(Load)
        .filter(Load.id == load_id)
        .first()
    )


def get_load_snapshot_by_id(
    db: Session,
    *,
    load_snapshot_id: int,
) -> LoadSnapshot | None:
    """
    Return one LoadSnapshot by id.
    """

    return (
        db.query(LoadSnapshot)
        .options(
            joinedload(LoadSnapshot.load),
            joinedload(LoadSnapshot.sources),
        )
        .filter(LoadSnapshot.id == load_snapshot_id)
        .first()
    )
