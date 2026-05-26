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
from app.models.load_snapshot import LoadSnapshot
from app.models.scoring_result import ScoringResult
from app.services.llm.base import LLMClient
from app.services.llm.gemini_client import GeminiClient
from app.services.prompts.ai_explanation_prompts import (
    PROMPT_VERSION,
    build_explanation_prompt,
)

logger = logging.getLogger(__name__)

DEFAULT_TOP_LOAD_LIMIT = 5
MIN_EXPLANATION_TEXT_LENGTH = 40


def stable_json(value: Any) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), default=str)


def build_input_hash(
    *,
    load_snapshot_id: int,
    score: float,
    breakdown: dict[str, Any] | None,
    prompt_version: str = PROMPT_VERSION,
) -> str:
    raw_input = stable_json(
        {
            "load_snapshot_id": load_snapshot_id,
            "score": score,
            "breakdown": breakdown or {},
            "prompt_version": prompt_version,
        }
    )
    return hashlib.sha256(raw_input.encode("utf-8")).hexdigest()

def is_complete_explanation(text: str | None) -> bool:
    if not text:
        return False

    cleaned = text.strip()

    if len(cleaned) < 80:
        return False

    if not cleaned.endswith((".", "!", "?")):
        return False

    return True


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

        # Reuse only successful explanations.
        # Do NOT reuse failed/null explanations.
        if (
            existing is not None
            and existing.explanation_text
            and len(existing.explanation_text.strip()) >= MIN_EXPLANATION_TEXT_LENGTH
        ):
            return existing

        return self.generate_for_load(
            db=db,
            scoring_result=scoring_result,
            snapshot=snapshot,
            input_hash=input_hash,
            existing=existing,
        )

    def generate_for_load(
        self,
        db: Session,
        *,
        scoring_result: ScoringResult,
        snapshot: LoadSnapshot,
        input_hash: str | None = None,
        existing: AIExplanation | None = None,
    ) -> AIExplanation | None:
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
            if not is_complete_explanation(explanation_text):
                logger.error(
                    "Skipping incomplete AI explanation for scoring_result_id=%s: %r",
                    scoring_result.id,
                    explanation_text,
                )
                return None

            if explanation_text:
                explanation_text = explanation_text.strip()

            if not explanation_text:
                logger.error(
                    "Gemini returned empty explanation for scoring_result_id=%s",
                    scoring_result.id,
                )

        except Exception:
            logger.exception(
                "AI explanation generation failed for scoring_result_id=%s",
                scoring_result.id,
            )

        if not explanation_text:
            logger.error(
                "Skipping incomplete AI explanation for scoring_result_id=%s",
                scoring_result.id,
            )
            return None

        if len(explanation_text.strip()) < MIN_EXPLANATION_TEXT_LENGTH:
            logger.error(
                "Skipping incomplete AI explanation for scoring_result_id=%s",
                scoring_result.id,
            )
            return None

        # If an old failed/null row exists for this input_hash, update it only
        # after a successful generation.
        if existing is not None:
            existing.provider = self.llm_client.provider
            existing.model_name = self.llm_client.model_name
            existing.explanation_text = explanation_text
            existing.prompt_version = PROMPT_VERSION
            existing.input_hash = input_hash

            db.commit()
            db.refresh(existing)
            return existing

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

        if (
            explanation is not None
            and (
                not explanation.explanation_text
                or len(explanation.explanation_text.strip())
                < MIN_EXPLANATION_TEXT_LENGTH
            )
        ):
            return None

        return explanation

    def generate_for_top_loads(
        self,
        db: Session,
        *,
        scoring_results: list[ScoringResult],
        limit: int = DEFAULT_TOP_LOAD_LIMIT,
    ) -> dict[int, AIExplanation]:
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

            if (
                explanation is not None
                and explanation.explanation_text
                and len(explanation.explanation_text.strip())
                >= MIN_EXPLANATION_TEXT_LENGTH
            ):
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
    dispatcher_user_ids = {result.dispatcher_user_id for result in scoring_results}
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
        and explanation.explanation_text
        and len(explanation.explanation_text.strip()) >= MIN_EXPLANATION_TEXT_LENGTH
    }
