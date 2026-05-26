"""
AI explanation prompts.
"""

import json
from typing import Any

from app.models.load import Load
from app.models.load_snapshot import LoadSnapshot
from app.models.scoring_result import ScoringResult


PROMPT_VERSION = "v2_dispatcher_paragraph"


def calculate_rate_per_mile(snapshot: LoadSnapshot) -> float | None:
    if snapshot.posted_rate is None or not snapshot.miles:
        return None

    return round(snapshot.posted_rate / snapshot.miles, 2)


def format_location(city: str | None, state: str | None) -> str:
    parts = [part for part in [city, state] if part]
    return ", ".join(parts) if parts else "Unknown"


def stable_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)


def build_explanation_prompt(
    *,
    snapshot: LoadSnapshot,
    load: Load,
    scoring_result: ScoringResult,
) -> str:
    """
    Build a one-paragraph dispatcher explanation prompt.
    """

    rate_per_mile = calculate_rate_per_mile(snapshot)

    
    return f"""
    Write one practical dispatcher note in 2 complete sentences.

    Do not use bullets, numbering, headings, or hype words.
    Mention the main strength and the main weakness.
    Use only this data.

    Rate: {snapshot.posted_rate}
    RPM: {rate_per_mile}
    Miles: {snapshot.miles}
    Lane: {format_location(load.origin_city, load.origin_state)} to {format_location(load.destination_city, load.destination_state)}
    Broker: {load.broker_name or "Unknown"}
    Score: {scoring_result.score}
    Breakdown: {stable_json(scoring_result.breakdown or {})}

    Return only the note.
    """.strip()
