"""
Load deduplication helpers.
"""

from typing import Any


def normalize_deduplication_value(value: Any) -> str:
    """
    Convert raw values into stable key parts for MVP deduplication.
    """

    if value is None:
        return ""

    if isinstance(value, float):
        return str(int(value)) if value.is_integer() else str(value)

    return str(value).strip().lower()


def build_load_deduplication_key(raw_load: dict) -> str:
    """
    Build the MVP load deduplication key.

    If multiple boards return the same practical load, this key allows them
    to share one stable Load record while still creating separate snapshots.
    """

    parts = [
        raw_load.get("broker_name"),
        raw_load.get("equipment_type"),
        raw_load.get("origin_city"),
        raw_load.get("origin_state"),
        raw_load.get("destination_city"),
        raw_load.get("destination_state"),
        raw_load.get("posted_rate", raw_load.get("rate")),
        raw_load.get("weight"),
    ]

    return "|".join(
        normalize_deduplication_value(part)
        for part in parts
    )
