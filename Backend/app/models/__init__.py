"""
Import all SQLAlchemy models here.

Purpose:
- Makes Alembic aware of all models
- Registers models inside SQLAlchemy metadata

IMPORTANT:
If model is not imported here,
Alembic may not detect it during migrations.
"""

from app.models.user import User
from app.models.company import Company
from app.models.company_membership import CompanyMembership
from app.models.driver import Driver
from app.models.truck import Truck
from app.models.load_board_session import LoadBoardSession
from app.models.search_batch import SearchBatch
from app.models.truck_search_session import TruckSearchSession
from app.models.worker_log import WorkerLog
from app.models.load import Load
from app.models.load_snapshot import LoadSnapshot
from app.models.load_source import LoadSource
from app.models.dispatcher_action import DispatcherAction
from app.models.booked_load import BookedLoad
from app.models.scoring_preference import ScoringPreference
from app.models.scoring_result import ScoringResult
