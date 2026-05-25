# AI-Assisted Dispatching MVP — Backend Structure

## 1. Backend Structure Goal

The backend structure should keep the FastAPI project clean, modular, and easy to extend.

The MVP backend must support:

```txt
Authentication
Company management
User memberships
Truck management
Driver management
Load-board sessions
Search orchestration
Mock search workers
Load result storage
Dispatcher actions
Booked loads
Rule-based scoring
AI explanations
WebSocket progress updates
Worker/debug logs
```

The main goal is:

```txt
Keep endpoints thin.
Put business logic inside services.
Put database models inside models.
Put request/response validation inside schemas.
Keep workers separate from API routes.
```

---

## 2. Recommended Root Project Structure

```txt
AI_Asisted_Dispaching/
│
├── backend/
│   │
│   ├── app/
│   │   ├── main.py
│   │   ├── __init__.py
│   │   │
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── deps.py
│   │   │   └── v1/
│   │   │       ├── __init__.py
│   │   │       ├── auth.py
│   │   │       ├── companies.py
│   │   │       ├── memberships.py
│   │   │       ├── trucks.py
│   │   │       ├── drivers.py
│   │   │       ├── load_boards.py
│   │   │       ├── searches.py
│   │   │       ├── loads.py
│   │   │       ├── dispatcher_actions.py
│   │   │       ├── bookings.py
│   │   │       ├── scoring.py
│   │   │       └── websockets.py
│   │   │
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   ├── permissions.py
│   │   │   └── constants.py
│   │   │
│   │   ├── db/
│   │   │   ├── __init__.py
│   │   │   ├── database.py
│   │   │   ├── base.py
│   │   │   └── session.py
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── company.py
│   │   │   ├── company_membership.py
│   │   │   ├── truck.py
│   │   │   ├── driver.py
│   │   │   ├── load_board_session.py
│   │   │   ├── search_batch.py
│   │   │   ├── truck_search_session.py
│   │   │   ├── load.py
│   │   │   ├── load_snapshot.py
│   │   │   ├── load_source.py
│   │   │   ├── dispatcher_action.py
│   │   │   ├── booked_load.py
│   │   │   ├── scoring_preference.py
│   │   │   ├── scoring_result.py
│   │   │   ├── ai_explanation.py
│   │   │   └── worker_log.py
│   │   │
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── user.py
│   │   │   ├── company.py
│   │   │   ├── membership.py
│   │   │   ├── truck.py
│   │   │   ├── driver.py
│   │   │   ├── load_board.py
│   │   │   ├── search.py
│   │   │   ├── load.py
│   │   │   ├── dispatcher_action.py
│   │   │   ├── booking.py
│   │   │   ├── scoring.py
│   │   │   ├── ai.py
│   │   │   └── websocket.py
│   │   │
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── auth_service.py
│   │   │   ├── company_service.py
│   │   │   ├── membership_service.py
│   │   │   ├── truck_service.py
│   │   │   ├── driver_service.py
│   │   │   ├── load_board_service.py
│   │   │   ├── search_service.py
│   │   │   ├── load_service.py
│   │   │   ├── dispatcher_action_service.py
│   │   │   ├── booking_service.py
│   │   │   ├── scoring_service.py
│   │   │   ├── ai_explanation_service.py
│   │   │   └── worker_log_service.py
│   │   │
│   │   ├── workers/
│   │   │   ├── __init__.py
│   │   │   ├── mock_search_worker.py
│   │   │   ├── search_worker.py
│   │   │   ├── worker_manager.py
│   │   │   └── browser_manager.py
│   │   │
│   │   ├── websockets/
│   │   │   ├── __init__.py
│   │   │   ├── connection_manager.py
│   │   │   └── events.py
│   │   │
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── datetime.py
│   │       ├── deduplication.py
│   │       └── pagination.py
│   │
│   ├── alembic/
│   │   └── versions/
│   │
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_auth.py
│   │   ├── test_companies.py
│   │   ├── test_trucks.py
│   │   ├── test_drivers.py
│   │   ├── test_searches.py
│   │   └── test_bookings.py
│   │
│   ├── .env.example
│   ├── alembic.ini
│   ├── requirements.txt
│   └── README.md
│
├── docs/
│   ├── system-architecture.md
│   ├── database-domain-model.md
│   ├── api-endpoints.md
│   ├── backend-structure.md
│   ├── implementation-roadmap.md
│   └── websocket-events.md
│
└── README.md
```

---

## 3. Backend Layer Responsibilities

The backend should be divided into clear layers.

```txt
API layer
  |
  v
Schema layer
  |
  v
Service layer
  |
  v
Model / Database layer
  |
  v
Worker / WebSocket layer
```

Main rule:

```txt
API routes should not contain heavy business logic.
API routes should call services.
Services should handle business decisions.
Models should only describe database tables.
Schemas should validate request and response data.
Workers should handle background search execution.
```

---

# 4. app/main.py

## Purpose

`main.py` is the FastAPI application entry point.

It should:

```txt
Create FastAPI app
Register routers
Configure CORS
Add startup/shutdown events
Connect WebSocket routes
Expose health check endpoint
```

## Example responsibilities

```txt
Initialize FastAPI app
Include API v1 routers
Configure middleware
Load settings
```

## Should not contain

```txt
Database table definitions
Business logic
Search worker logic
Large endpoint implementations
```

---

# 5. app/api/

## Purpose

The `api/` folder contains FastAPI route definitions.

Each file should represent one API group.

```txt
auth.py
companies.py
trucks.py
drivers.py
searches.py
loads.py
bookings.py
```

API files should be thin.

They should:

```txt
Receive request
Validate with Pydantic schema
Call service function
Return response
```

They should not:

```txt
Contain complex business logic
Directly run scoring logic
Directly manage browser automation
Directly contain large database operations
```

---

## 5.1 app/api/deps.py

## Purpose

Common FastAPI dependencies.

Examples:

```txt
Get current user
Get database session
Check company membership
Check admin role
Check TruckSearchSession ownership
```

Possible dependencies:

```txt
get_db
get_current_user
get_current_company
require_company_member
require_company_admin
require_truck_search_owner
```

---

## 5.2 app/api/v1/auth.py

## Purpose

Authentication routes.

Related endpoints:

```txt
POST /auth/register
POST /auth/login
GET /auth/me
```

Uses:

```txt
AuthService
User schemas
JWT utilities
Password hashing
```

---

## 5.3 app/api/v1/companies.py

## Purpose

Company management routes.

Related endpoints:

```txt
POST /companies
GET /companies
GET /companies/{company_id}
PATCH /companies/{company_id}
```

Uses:

```txt
CompanyService
MembershipService
Company schemas
```

---

## 5.4 app/api/v1/memberships.py

## Purpose

Company user membership routes.

Related endpoints:

```txt
POST /companies/{company_id}/members/invite
GET /companies/{company_id}/members
PATCH /companies/{company_id}/members/{membership_id}
DELETE /companies/{company_id}/members/{membership_id}
```

Uses:

```txt
MembershipService
Permission checks
Admin-only logic
```

---

## 5.5 app/api/v1/trucks.py

## Purpose

Truck management routes.

Related endpoints:

```txt
POST /companies/{company_id}/trucks
GET /companies/{company_id}/trucks
GET /trucks/{truck_id}
PATCH /trucks/{truck_id}
DELETE /trucks/{truck_id}
```

Uses:

```txt
TruckService
Truck schemas
Company membership validation
```

---

## 5.6 app/api/v1/drivers.py

## Purpose

Driver management routes.

Related endpoints:

```txt
POST /companies/{company_id}/drivers
GET /companies/{company_id}/drivers
GET /drivers/{driver_id}
PATCH /drivers/{driver_id}
DELETE /drivers/{driver_id}
POST /trucks/{truck_id}/assign-driver
```

Uses:

```txt
DriverService
TruckService
Driver schemas
```

---

## 5.7 app/api/v1/load_boards.py

## Purpose

Load-board session management routes.

Related endpoints:

```txt
POST /companies/{company_id}/load-boards
GET /companies/{company_id}/load-boards
GET /load-boards/{session_id}
PATCH /load-boards/{session_id}
POST /load-boards/{session_id}/check-health
```

Uses:

```txt
LoadBoardService
LoadBoardSession model
Session health logic
```

---

## 5.8 app/api/v1/searches.py

## Purpose

Search management routes.

Related endpoints:

```txt
POST /searches/start
GET /searches/{search_batch_id}
GET /searches/{search_batch_id}/truck-sessions
GET /truck-search-sessions/{truck_search_session_id}
POST /truck-search-sessions/{truck_search_session_id}/cancel
```

Uses:

```txt
SearchService
WorkerManager
TruckSearchSession ownership logic
WebSocket events
```

---

## 5.9 app/api/v1/loads.py

## Purpose

Load result routes.

Related endpoints:

```txt
GET /truck-search-sessions/{truck_search_session_id}/loads
GET /loads/{load_id}
GET /load-snapshots/{load_snapshot_id}
```

Uses:

```txt
LoadService
ScoringResult
AIExplanation
Pagination
Filtering
```

---

## 5.10 app/api/v1/dispatcher_actions.py

## Purpose

Dispatcher action routes.

Related endpoints:

```txt
POST /truck-search-sessions/{truck_search_session_id}/loads/{load_id}/save
POST /truck-search-sessions/{truck_search_session_id}/loads/{load_id}/reject
POST /truck-search-sessions/{truck_search_session_id}/loads/{load_id}/favorite
POST /truck-search-sessions/{truck_search_session_id}/loads/{load_id}/contacted
```

Uses:

```txt
DispatcherActionService
Ownership checks
Action history
```

---

## 5.11 app/api/v1/bookings.py

## Purpose

Booked-load routes.

Related endpoints:

```txt
POST /loads/{load_id}/book
GET /companies/{company_id}/booked-loads
GET /booked-loads/{booked_load_id}
PATCH /booked-loads/{booked_load_id}
```

Uses:

```txt
BookingService
TruckService
DriverService
LoadService
```

---

## 5.12 app/api/v1/scoring.py

## Purpose

Scoring preference and scoring result routes.

Related endpoints:

```txt
GET /companies/{company_id}/scoring-preferences/me
PATCH /companies/{company_id}/scoring-preferences/me
GET /load-snapshots/{load_snapshot_id}/score
```

Uses:

```txt
ScoringService
ScoringPreference model
ScoringResult model
```

---

## 5.13 app/api/v1/websockets.py

## Purpose

WebSocket endpoint routes.

Related endpoints:

```txt
WS /ws/companies/{company_id}
WS /ws/searches/{search_batch_id}
```

Uses:

```txt
ConnectionManager
WebSocket events
Current user validation
Company membership validation
```

---

# 6. app/core/

## Purpose

The `core/` folder contains shared configuration and security logic.

---

## 6.1 app/core/config.py

## Purpose

Application settings.

Stores:

```txt
DATABASE_URL
SECRET_KEY
ACCESS_TOKEN_EXPIRE_MINUTES
ENVIRONMENT
CORS_ORIGINS
OPENAI_API_KEY
```

Should read from:

```txt
.env
.env.example
environment variables
```

---

## 6.2 app/core/security.py

## Purpose

Security utilities.

Handles:

```txt
Password hashing
Password verification
JWT creation
JWT decoding
Token expiration
```

Used by:

```txt
AuthService
get_current_user dependency
```

---

## 6.3 app/core/permissions.py

## Purpose

Centralized permission logic.

Handles checks like:

```txt
Is user company member?
Is user company admin?
Can user access truck?
Can user access search?
Can user manipulate TruckSearchSession?
```

Important rule:

```txt
Only TruckSearchSession.owner_user_id can manipulate active search results.
```

---

## 6.4 app/core/constants.py

## Purpose

Shared constants and enum-like values.

Examples:

```txt
User roles
Truck statuses
Driver statuses
Search statuses
Load-board statuses
Dispatcher action types
Booked load statuses
WebSocket event names
```

---

# 7. app/db/

## Purpose

The `db/` folder contains database connection setup.

---

## 7.1 app/db/database.py

## Purpose

Creates the database engine and session factory.

Responsibilities:

```txt
Create SQLAlchemy engine
Create SessionLocal
Expose database connection tools
```

---

## 7.2 app/db/base.py

## Purpose

Imports all database models so Alembic can detect them.

Important because:

```txt
Alembic autogenerate needs all models imported.
```

---

## 7.3 app/db/session.py

## Purpose

Provides database session dependency.

Used by:

```txt
FastAPI endpoints
Services
Tests
```

---

# 8. app/models/

## Purpose

The `models/` folder contains SQLAlchemy table definitions.

Each file maps to one major database table.

Example:

```txt
user.py -> users table
company.py -> companies table
truck.py -> trucks table
load.py -> loads table
```

Models should define:

```txt
Columns
Foreign keys
Relationships
Indexes
Constraints
```

Models should not contain:

```txt
Business workflows
API response formatting
Large service methods
```

---

# 9. app/schemas/

## Purpose

The `schemas/` folder contains Pydantic models.

Schemas define:

```txt
Request body validation
Response body structure
Shared API data shapes
```

Example schema groups:

```txt
UserCreate
UserResponse
CompanyCreate
CompanyResponse
TruckCreate
TruckUpdate
TruckResponse
SearchStartRequest
SearchBatchResponse
LoadResultResponse
BookedLoadCreate
BookedLoadResponse
```

Rule:

```txt
SQLAlchemy models are for database.
Pydantic schemas are for API input/output.
Do not mix them.
```

---

# 10. app/services/

## Purpose

The `services/` folder contains business logic.

Services are the main place where the system's real logic should live.

API routes should call services.

---

## 10.1 AuthService

Responsibilities:

```txt
Register users
Authenticate users
Hash passwords
Create access tokens
Return current user data
```

---

## 10.2 CompanyService

Responsibilities:

```txt
Create company
Get user companies
Update company
Validate company access
```

---

## 10.3 MembershipService

Responsibilities:

```txt
Invite user
Add user to company
Remove user from company
Change user role
Check membership status
```

---

## 10.4 TruckService

Responsibilities:

```txt
Create truck
List company trucks
Update truck
Delete/deactivate truck
Assign driver display data
Update truck status
```

---

## 10.5 DriverService

Responsibilities:

```txt
Create driver
List company drivers
Update driver
Deactivate driver
Manage driver preferences
```

---

## 10.6 LoadBoardService

Responsibilities:

```txt
Create load-board session record
Update session status
Check session health
Mark session expired
Store debug information
```

---

## 10.7 SearchService

Responsibilities:

```txt
Start SearchBatch
Create TruckSearchSessions
Validate selected trucks
Set search ownership
Trigger WorkerManager
Update search statuses
Return search summary
```

Important:

```txt
SearchService coordinates search.
It should not directly contain browser automation logic.
```

---

## 10.8 LoadService

Responsibilities:

```txt
Create or find Load
Create LoadSnapshot
Create LoadSource
Deduplicate loads
Return ranked load results
Return load details
```

---

## 10.9 DispatcherActionService

Responsibilities:

```txt
Save load
Reject load
Favorite load
Mark load as contacted
Validate TruckSearchSession ownership
Store action history
```

---

## 10.10 BookingService

Responsibilities:

```txt
Book load
Store final negotiated rate
Connect load to truck
Connect load to driver
Connect booking to dispatcher
Update booked-load status
Return booked-load history
```

---

## 10.11 ScoringService

Responsibilities:

```txt
Load dispatcher scoring preferences
Calculate rule-based score
Store score breakdown
Rank load results
Return scoring details
```

---

## 10.12 AIExplanationService

Responsibilities:

```txt
Select top 5–10 loads
Generate AI explanation
Store explanation
Return saved explanation
Avoid regenerating existing explanation
```

---

## 10.13 WorkerLogService

Responsibilities:

```txt
Create worker logs
Store browser/session errors
Store progress events
Return debugging history
```

---

# 11. app/workers/

## Purpose

The `workers/` folder contains logic that runs searches outside normal request-response API logic.

For MVP, start simple with mock workers.

Later, replace or extend with real browser automation.

---

## 11.1 mock_search_worker.py

## Purpose

Simulates load-board search without real scraping.

Useful for:

```txt
Building frontend
Testing search flow
Testing WebSocket progress
Testing scoring
Testing booking
Avoiding browser automation complexity early
```

Mock worker flow:

```txt
Receive TruckSearchSession
Emit search started event
Wait/simulate delay
Create mock loads
Create load snapshots
Run scoring
Generate fake/real AI explanations later
Emit search completed event
```

---

## 11.2 search_worker.py

## Purpose

Future real worker for load-board search.

Responsibilities:

```txt
Use browser sessions
Search real load boards
Parse real load data
Handle load-board failures
Store real results
Emit progress events
```

---

## 11.3 worker_manager.py

## Purpose

Controls worker execution.

Responsibilities:

```txt
Start worker for each TruckSearchSession
Track running workers
Apply timeouts
Cancel workers
Update statuses
Notify WebSocket manager
```

---

## 11.4 browser_manager.py

## Purpose

Manages browser automation later.

Responsibilities:

```txt
Start Playwright browser
Create separate browser context per load board
Load company session
Detect expired login
Close browser contexts
Handle browser errors
```

---

# 12. app/websockets/

## Purpose

The `websockets/` folder contains real-time connection and event logic.

---

## 12.1 connection_manager.py

## Purpose

Manages active WebSocket connections.

Responsibilities:

```txt
Connect user
Disconnect user
Track company connections
Track search connections
Broadcast to company
Broadcast to search
Send event to one user
```

---

## 12.2 events.py

## Purpose

Defines WebSocket event names and event builders.

Example events:

```txt
search.started
truck_search.started
load_board.connected
load_board.failed
loads.found
loads.deduplicated
scoring.completed
ai_explanations.completed
search.completed
search.failed
```

Standard event shape:

```txt
{
  "event_type": "loads.found",
  "search_batch_id": "...",
  "truck_search_session_id": "...",
  "message": "15 loads found",
  "data": {},
  "timestamp": "..."
}
```

---

# 13. app/utils/

## Purpose

The `utils/` folder contains small helper functions that are not full services.

Examples:

```txt
datetime helpers
deduplication key generation
pagination helpers
formatting helpers
```

---

## 13.1 datetime.py

Responsibilities:

```txt
Get current UTC time
Convert timezone
Format timestamps
```

---

## 13.2 deduplication.py

Responsibilities:

```txt
Build load deduplication key
Normalize broker names
Normalize origin/destination
Compare possible duplicate loads
```

---

## 13.3 pagination.py

Responsibilities:

```txt
Limit/offset helpers
Pagination response metadata
```

---

# 14. tests/

## Purpose

The `tests/` folder contains backend tests.

Initial tests should focus on:

```txt
Auth flow
Company creation
Truck creation
Driver creation
Search creation
Mock load result creation
Dispatcher action ownership
Booking flow
```

Recommended early tests:

```txt
test_auth.py
test_companies.py
test_trucks.py
test_drivers.py
test_searches.py
test_bookings.py
```

---

# 15. docs/

## Purpose

The `docs/` folder stores project planning and technical documentation.

Current recommended docs:

```txt
system-architecture.md
database-domain-model.md
api-endpoints.md
backend-structure.md
implementation-roadmap.md
websocket-events.md
```

Docs should be updated when architecture changes.

---

# 16. Important Design Rules

```txt
Do not put business logic inside route files.
Do not mix SQLAlchemy models with Pydantic schemas.
Do not start with real browser automation.
Build mock search flow first.
Keep services focused on business logic.
Keep workers focused on search execution.
Keep WebSocket events standardized.
Keep permissions centralized.
Use company_id checks everywhere company data is accessed.
Use TruckSearchSession.owner_user_id for active search control.
```

---

# 17. First Backend Build Target

The first backend version should support:

```txt
FastAPI app runs
Database connects
Health check works
User can register/login
User can create company
User can create truck
User can create driver
User can start mock search
Mock loads are created
Search progress can be streamed
Loads can be saved/rejected/contacted
Load can be booked
```

This gives a working MVP skeleton before adding real load-board automation.

---

# 18. Recommended First Coding Order

```txt
1. Create backend folder
2. Create FastAPI app
3. Add config and database connection
4. Add SQLAlchemy base
5. Add User, Company, CompanyMembership models
6. Add AuthService
7. Add auth endpoints
8. Add company endpoints
9. Add truck and driver models
10. Add truck and driver endpoints
11. Add search models
12. Add mock search worker
13. Add WebSocket connection manager
14. Add load result models
15. Add dispatcher action models
16. Add booked load models
17. Add scoring service
18. Add AI explanation service
```
