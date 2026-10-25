# Veliora backend

FastAPI API, SQLAlchemy persistence, Alembic migrations, simulated search workers,
rule-based ranking, dispatcher actions, booking records, and optional Gemini
explanations. The current search worker generates mock freight; it does not query
DAT, Truckstop, or other live boards.

Read [the project-state report](../Docs/PROJECT_STATE.md) for verified capabilities,
known defects, validation results, and remaining decisions.

## Local setup

Run from `Backend/` with Python and a local PostgreSQL database available:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Copy the template only when creating a new `.env`; preserve an existing one.
Set `DATABASE_URL`, `SECRET_KEY`, and `ACCESS_TOKEN_EXPIRE_MINUTES` in `.env`.
`GEMINI_API_KEY` is optional for search/scoring and required for real AI generation.
Never commit credentials. The reviewed runtime used Python 3.13.2; the repository
does not declare a supported Python version or lock its Python dependencies.

## Migrations and server

`alembic/env.py` currently reads the URL in `alembic.ini`, independently of `.env`.
That tracked configuration contains a password-bearing URL. Avoid using its
embedded credentials. To explicitly use your configured `DATABASE_URL`, run:

```powershell
python -c "from alembic.config import Config; from alembic import command; from app.core.config import settings; cfg = Config('alembic.ini'); cfg.set_main_option('sqlalchemy.url', settings.DATABASE_URL.replace('%', '%%')); command.upgrade(cfg, 'head')"
python -m uvicorn app.main:app --reload --port 8000
```

The migration command changes the selected database; verify that it is the intended
local database first. The repository head is `b82f6e4d9a12`. A running database's
applied revision was not inspected during the review.

Open `http://localhost:8000/docs` for the registered API contract, or `/health`
for process health. The health endpoint does not check database connectivity.
Login takes form fields `username` (email) and `password`; registration takes JSON.
HTTP routes have no `/api/v1` URL prefix despite their source folder name.
The frontend's allowed development origins are ports 3000 and 3001.

## Existing checks

For isolated service tests, install development tools separately:

```powershell
python -m pip install pytest httpx
$env:DATABASE_URL = 'sqlite://'
$env:SECRET_KEY = 'disposable-local-test-key'
$env:ACCESS_TOKEN_EXPIRE_MINUTES = '60'
$env:GEMINI_API_KEY = ''
python -m pytest tests/test_searches.py tests/test_dispatcher_actions.py tests/test_bookings.py tests/test_websockets.py -q -p no:cacheprovider
```

These process-local settings override `.env` and use disposable SQLite fixtures.
Review result: 13 passed, 1 failed; see the report for the ambiguous same-broker
selector in the failing test. This does not verify PostgreSQL migrations or a
browser workflow.

`test_auth.py`, `test_companies.py`, `test_trucks.py`, and `test_drivers.py` are empty.
`test_scoring.py` and `test_ai_explanations.py` are manual HTTP scripts, not pytest
test cases. They additionally import `requests`, which is absent from
`requirements.txt`. The scoring script creates/updates booking records, and the AI
script can make paid Gemini calls through the backend; they were not executed.

## Code ownership

- `app/main.py`: application and registered routers.
- `app/api/v1/`, `app/schemas/`: routes and request/response contracts.
- `app/services/`: business rules, ranking, persistence, and AI calls.
- `app/models/`, `app/db/`, `alembic/`: database models, sessions, and migrations.
- `app/workers/`: sequential mock workers scheduled through FastAPI BackgroundTasks.
- `app/websockets/`: process-local event delivery; no durable queue or Redis.

The older phase documents in `Docs/` retain development rationale; their historical
examples are not the current setup or API reference.
