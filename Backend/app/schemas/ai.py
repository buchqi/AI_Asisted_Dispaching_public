"""
Pydantic schemas for AI explanations.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AIExplanationResponse(BaseModel):
    id: int
    load_snapshot_id: int
    explanation_text: str | None
    provider: str
    model_name: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
