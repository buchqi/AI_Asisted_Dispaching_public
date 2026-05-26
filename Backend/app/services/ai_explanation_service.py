"""
AI explanation service.
"""

import hashlib
import json
import logging
from typing import Any

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.models.ai_explanation import AIExplanation
from app.models.load import Load
from app.models.load_snapshot import LoadSnapshot
from app.models.scoring_result import ScoringResult
from app.services.llm.base import LLMClient
from app.services.llm.gemini_client import GeminiClient


logger = logging.getLogger(__name__)

PROMPT_VERSION = "ai_explanation_v1"
DEFAULT_TOP_LOAD_LIMIT = 5


def calculate_rate_per_mile(snapshot: LoadSnapshot) -> float | None:
    if snapshot.posted_rate is None or not snapshot.miles:
        return None

    return round(snapshot.posted_rate / snapshot.miles, 2)


def format_location(city: str | None, state: str | None) -> str:
    parts = [part for part in [city, state] if part]
    return ", ".join(parts) if parts else "Unknown"


def stable_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)


def build_input_hash(
    *,
    load_snapshot_id: int,
    score: float,
    breakdown: dict[str, Any] | None,
    prompt_version: str = PROMPT_VERSION,
) -> str:
    """
    Build a deterministic hash for explanation reuse.
    """

    raw_input = stable_json(
        {
            "load_snapshot_id": load_snapshot_id,
            "score": score,
            "breakdown": breakdown or {},
            "prompt_version": prompt_version,
        }
    )

    return hashlib.sha256(raw_input.encode("utf-8")).hexdigest()


def build_explanation_prompt(
    *,
    snapshot: LoadSnapshot,
    load: Load,
    scoring_result: ScoringResult,
) -> str:
    """
    Build the freight-dispatcher explanation prompt.
    """

    rate_per_mile = calculate_rate_per_mile(snapshot)

    return f"""
You are an experienced freight dispatcher.

Your task is to explain why this load received a high score.

Use ONLY the information provided.

Load Information:
- Rate: {snapshot.posted_rate}
- Rate Per Mile: {rate_per_mile}
- Miles: {snapshot.miles}
- Origin: {format_location(load.origin_city, load.origin_state)}
- Destination: {format_location(load.destination_city, load.destination_state)}
- Broker: {load.broker_name or "Unknown"}

Scoring Information:
- Final Score: {scoring_result.score}
- Score Breakdown: {stable_json(scoring_result.breakdown or {})}

Explain:

1. Why the load is attractive.
2. Any possible weaknesses or risks.
3. A short recommendation.

Do not invent facts.
Do not assume missing information.
Keep the explanation concise.
Maximum 120 words.
""".strip()


class AIExplanationService:
    """
    Generates and reuses AI explanations for top rule-scored loads.
    """

    def __init__(self, llm_client: LLMClient | None = None):
        self.llm_client = llm_client or GeminiClient()

    def get_or_create_explanation(
        self,
        db: Session,
        *,
        scoring_result: ScoringResult,
    ) -> AIExplanation | None:
        """
        Return an existing explanation or generate/store a new one.

        Gemini failures are logged and converted into a nullable explanation
        row so the search and scoring workflows continue.
        """

        snapshot = self._load_snapshot(
            db=db,
            load_snapshot_id=scoring_result.load_snapshot_id,
        )

        if snapshot is None or snapshot.load is None:
            logger.error(
                "Cannot generate AI explanation without snapshot/load: %s",
                scoring_result.load_snapshot_id,
            )
            return None

        input_hash = build_input_hash(
            load_snapshot_id=scoring_result.load_snapshot_id,
            score=scoring_result.score,
            breakdown=scoring_result.breakdown,
        )
        existing = self.get_existing_explanation(
            db=db,
            company_id=scoring_result.company_id,
            dispatcher_user_id=scoring_result.dispatcher_user_id,
            input_hash=input_hash,
        )

        if existing is not None:
            return existing

        return self.generate_for_load(
            db=db,
            scoring_result=scoring_result,
            snapshot=snapshot,
            input_hash=input_hash,
        )

    def generate_for_load(
        self,
        db: Session,
        *,
        scoring_result: ScoringResult,
        snapshot: LoadSnapshot,
        input_hash: str | None = None,
    ) -> AIExplanation | None:
        """
        Generate, store, and return one explanation.
        """

        input_hash = input_hash or build_input_hash(
            load_snapshot_id=scoring_result.load_snapshot_id,
            score=scoring_result.score,
            breakdown=scoring_result.breakdown,
        )
        explanation_text: str | None = None

        try:
            prompt = build_explanation_prompt(
                snapshot=snapshot,
                load=snapshot.load,
                scoring_result=scoring_result,
            )
            explanation_text = self.llm_client.generate_text(prompt)
        except Exception:
            logger.exception(
                "AI explanation generation failed for scoring_result_id=%s",
                scoring_result.id,
            )

        explanation = AIExplanation(
            company_id=scoring_result.company_id,
            dispatcher_user_id=scoring_result.dispatcher_user_id,
            load_id=scoring_result.load_id,
            load_snapshot_id=scoring_result.load_snapshot_id,
            scoring_result_id=scoring_result.id,
            truck_search_session_id=scoring_result.truck_search_session_id,
            provider=self.llm_client.provider,
            model_name=self.llm_client.model_name,
            explanation_text=explanation_text,
            prompt_version=PROMPT_VERSION,
            input_hash=input_hash,
        )

        try:
            db.add(explanation)
            db.commit()
            db.refresh(explanation)
        except IntegrityError:
            db.rollback()
            explanation = self.get_existing_explanation(
                db=db,
                company_id=scoring_result.company_id,
                dispatcher_user_id=scoring_result.dispatcher_user_id,
                input_hash=input_hash,
            )

        return explanation

    def generate_for_top_loads(
        self,
        db: Session,
        *,
        scoring_results: list[ScoringResult],
        limit: int = DEFAULT_TOP_LOAD_LIMIT,
    ) -> dict[int, AIExplanation]:
        """
        Generate explanations only for the highest scoring loads.
        """

        top_results = sorted(
            scoring_results,
            key=lambda result: result.score,
            reverse=True,
        )[:limit]
        explanations: dict[int, AIExplanation] = {}

        for scoring_result in top_results:
            explanation = self.get_or_create_explanation(
                db=db,
                scoring_result=scoring_result,
            )

            if explanation is not None:
                explanations[scoring_result.load_snapshot_id] = explanation

        return explanations

    def get_existing_explanation(
        self,
        db: Session,
        *,
        company_id: int,
        dispatcher_user_id: int,
        input_hash: str,
    ) -> AIExplanation | None:
        return (
            db.query(AIExplanation)
            .filter(
                AIExplanation.company_id == company_id,
                AIExplanation.dispatcher_user_id == dispatcher_user_id,
                AIExplanation.input_hash == input_hash,
            )
            .first()
        )

    def _load_snapshot(
        self,
        db: Session,
        *,
        load_snapshot_id: int,
    ) -> LoadSnapshot | None:
        return (
            db.query(LoadSnapshot)
            .options(joinedload(LoadSnapshot.load))
            .filter(LoadSnapshot.id == load_snapshot_id)
            .first()
        )


def get_existing_explanations_for_session(
    db: Session,
    *,
    truck_search_session_id: int,
    dispatcher_user_id: int,
) -> dict[int, AIExplanation]:
    """
    Return existing explanations keyed by load_snapshot_id.
    """

    explanations = (
        db.query(AIExplanation)
        .filter(
            AIExplanation.truck_search_session_id == truck_search_session_id,
            AIExplanation.dispatcher_user_id == dispatcher_user_id,
        )
        .all()
    )

    return {
        explanation.load_snapshot_id: explanation
        for explanation in explanations
    }


def get_existing_explanations_for_scores(
    db: Session,
    *,
    scoring_results: list[ScoringResult],
) -> dict[int, AIExplanation]:
    """
    Return existing explanations matching the current score inputs.
    """

    if not scoring_results:
        return {}

    input_hashes_by_snapshot_id = {
        result.load_snapshot_id: build_input_hash(
            load_snapshot_id=result.load_snapshot_id,
            score=result.score,
            breakdown=result.breakdown,
        )
        for result in scoring_results
    }
    input_hashes = set(input_hashes_by_snapshot_id.values())
    dispatcher_user_ids = {
        result.dispatcher_user_id
        for result in scoring_results
    }
    company_ids = {result.company_id for result in scoring_results}
    explanations = (
        db.query(AIExplanation)
        .filter(
            AIExplanation.input_hash.in_(input_hashes),
            AIExplanation.company_id.in_(company_ids),
            AIExplanation.dispatcher_user_id.in_(dispatcher_user_ids),
        )
        .all()
    )

    return {
        explanation.load_snapshot_id: explanation
        for explanation in explanations
        if input_hashes_by_snapshot_id.get(explanation.load_snapshot_id)
        == explanation.input_hash
    }
