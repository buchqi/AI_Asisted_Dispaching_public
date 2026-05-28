"""
Pydantic schemas for dispatcher load actions.
"""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DispatcherActionResponse(BaseModel):
    id: int
    company_id: int
    truck_search_session_id: int
    load_id: int
    load_snapshot_id: int
    dispatcher_user_id: int
    action_type: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LoadActionState(BaseModel):
    saved: bool = False
    rejected: bool = False
    favorite: bool = False
    contacted: bool = False
    latest_action_type: str | None = None
    active_action_type: str | None = None
