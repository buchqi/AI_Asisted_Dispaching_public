# AI-Assisted Dispatching MVP — Implementation Roadmap

## 1. Roadmap Goal

This roadmap defines the recommended build order for the AI-Assisted Dispatching MVP.

The goal is to avoid building random features in the wrong order.

The MVP should be built from the foundation upward:

```txt
Project setup
        |
        v
Database foundation
        |
        v
Authentication
        |
        v
Company / user access
        |
        v
Trucks and drivers
        |
        v
Mock search flow
        |
        v
Load results
        |
        v
Dispatcher actions
        |
        v
Booking flow
        |
        v
Scoring and AI
        |
        v
Real browser automation
```

Important MVP rule:

```txt
Build mock load search first.
Do not start with real load-board browser automation.
```

Reason:

```txt
Real browser automation is complex.
Load-board sessions can fail.
Parsing real boards will take time.
The product flow should work before scraping is added.
```

---

## 2. Current Planning Status

Already planned:

```txt
System architecture
Database/domain model
API endpoints
Backend structure
Visual sketches
```

Next planned documents:

```txt
Implementation roadmap
WebSocket event contract
Mock search flow
Service layer responsibilities
Frontend page plan
```

---

# 3. Phase 1 — Repository & Project Setup

## Goal

Create the initial project structure and make sure the backend can run.

## Build Items

```txt
Create repository structure
Create backend folder
Create FastAPI app
Create app/main.py
Create basic health check endpoint
Create .env.example
Create requirements.txt or pyproject.toml
Create docs folder
Add existing planning docs
```

## Recommended Files

```txt
backend/
  app/
    main.py
    __init__.py

docs/
  system-architecture.md
  database-domain-model.md
  api-endpoints.md
  backend-structure.md
  implementation-roadmap.md
```

## Health Check Endpoint

```txt
GET /health
```

Purpose:

```txt
Confirm backend is running.
Confirm FastAPI setup works.
```

## Done When

```txt
FastAPI server starts successfully.
GET /health returns success response.
Project structure exists in GitHub.
Planning docs are committed.
```

## Example Commit Message

```txt
setup: initialize FastAPI backend structure
```

---

# 4. Phase 2 — Database Setup

## Goal

Connect the backend to PostgreSQL and prepare SQLAlchemy/Alembic.

## Build Items

```txt
Configure PostgreSQL connection
Create SQLAlchemy engine
Create database session dependency
Create Base model
Configure Alembic
Create first migration
Test database connection
```

## Recommended Files

```txt
app/db/database.py
app/db/session.py
app/db/base.py
alembic.ini
alembic/
```

## Done When

```txt
Backend connects to database.
Alembic migration system works.
Initial migration can be created and applied.
```

## Example Commit Message

```txt
setup: configure database and migrations
```

---

# 5. Phase 3 — Core Models Foundation

## Goal

Create the first database models needed for auth and company access.

## Build Tables

```txt
users
companies
company_memberships
```

## Why First

These tables are required before almost every other feature.

Most MVP data belongs to a company, and users access that data through company membership.

## Build Items

```txt
Create User model
Create Company model
Create CompanyMembership model
Add relationships
Add basic indexes
Create migration
Apply migration
```

## Done When

```txt
users table exists.
companies table exists.
company_memberships table exists.
Relationships are defined.
Migration applies successfully.
```

## Example Commit Message

```txt
feat: add user company membership models
```

---

# 6. Phase 4 — Authentication

## Goal

Allow users to register, log in, and access protected routes.

## Build Items

```txt
Password hashing
JWT creation
JWT verification
Register endpoint
Login endpoint
Current user endpoint
Auth dependency
```

## Endpoints

```txt
POST /auth/register
POST /auth/login
GET /auth/me
```

## Recommended Files

```txt
app/api/v1/auth.py
app/services/auth_service.py
app/schemas/auth.py
app/schemas/user.py
app/core/security.py
app/api/deps.py
```

## Done When

```txt
User can register.
User can log in.
Backend returns access token.
GET /auth/me returns current user.
Protected route dependency works.
```

## Example Commit Message

```txt
feat: implement jwt authentication
```

---

# 7. Phase 5 — Companies & Memberships

## Goal

Allow users to create companies and manage simple company membership.

## Build Items

```txt
Create company
List my companies
Get selected company
Create initial admin membership
Invite/add dispatcher
List company members
Remove/disable member
Check company access
Check company admin permissions
```

## Endpoints

```txt
POST /companies
GET /companies
GET /companies/{company_id}
PATCH /companies/{company_id}

POST /companies/{company_id}/members/invite
GET /companies/{company_id}/members
PATCH /companies/{company_id}/members/{membership_id}
DELETE /companies/{company_id}/members/{membership_id}
```

## Recommended Files

```txt
app/api/v1/companies.py
app/api/v1/memberships.py
app/services/company_service.py
app/services/membership_service.py
app/schemas/company.py
app/schemas/membership.py
app/core/permissions.py
```

## Done When

```txt
User can create a company.
Creator becomes admin.
User can list companies they belong to.
Admin can add/remove members.
Company access checks work.
```

## Example Commit Message

```txt
feat: add company and membership management
```

---

# 8. Phase 6 — Trucks & Drivers

## Goal

Allow company users to manage trucks and drivers.

## Build Tables

```txt
trucks
drivers
```

## Build Items

```txt
Create truck
List company trucks
Update truck
Deactivate/delete truck
Create driver
List company drivers
Update driver
Deactivate driver
Assign driver to truck
Store current driver display fields on truck
```

## Endpoints

```txt
POST /companies/{company_id}/trucks
GET /companies/{company_id}/trucks
GET /trucks/{truck_id}
PATCH /trucks/{truck_id}
DELETE /trucks/{truck_id}

POST /companies/{company_id}/drivers
GET /companies/{company_id}/drivers
GET /drivers/{driver_id}
PATCH /drivers/{driver_id}
DELETE /drivers/{driver_id}

POST /trucks/{truck_id}/assign-driver
```

## Recommended Files

```txt
app/models/truck.py
app/models/driver.py
app/api/v1/trucks.py
app/api/v1/drivers.py
app/services/truck_service.py
app/services/driver_service.py
app/schemas/truck.py
app/schemas/driver.py
```

## Done When

```txt
Company users can create trucks.
Company users can create drivers.
Driver can be assigned to truck.
Truck displays current driver name/surname.
Truck status can be updated.
```

## Example Commit Message

```txt
feat: add truck and driver management
```

---

# 9. Phase 7 — Load Board Session Records

## Goal

Create database support for company-level load-board sessions.

For MVP, this phase stores session records only. Real browser login/session handling comes later.

## Build Table

```txt
load_board_sessions
```

## Build Items

```txt
Create load-board session record
List company load-board sessions
Update session status
Store session health/debug notes
Mark session expired
```

## Endpoints

```txt
POST /companies/{company_id}/load-boards
GET /companies/{company_id}/load-boards
GET /load-boards/{session_id}
PATCH /load-boards/{session_id}
POST /load-boards/{session_id}/check-health
```

## Recommended Files

```txt
app/models/load_board_session.py
app/api/v1/load_boards.py
app/services/load_board_service.py
app/schemas/load_board.py
```

## Done When

```txt
Company can store load-board session records.
Session status can be changed.
Session health/debug fields exist.
```

## Example Commit Message

```txt
feat: add load board session records
```

---

# 10. Phase 8 — Search Models

## Goal

Create database models for search batches and truck-specific search sessions.

## Build Tables

```txt
search_batches
truck_search_sessions
worker_logs
```

## Build Items

```txt
Create SearchBatch model
Create TruckSearchSession model
Create WorkerLog model
Create relationships
Add search statuses
Add owner_user_id
Add filters_snapshot
Add timeout fields
```

## Endpoints

```txt
POST /searches/start
GET /searches/{search_batch_id}
GET /searches/{search_batch_id}/truck-sessions
GET /truck-search-sessions/{truck_search_session_id}
POST /truck-search-sessions/{truck_search_session_id}/cancel
```

## Recommended Files

```txt
app/models/search_batch.py
app/models/truck_search_session.py
app/models/worker_log.py
app/api/v1/searches.py
app/services/search_service.py
app/services/worker_log_service.py
app/schemas/search.py
```

## Done When

```txt
SearchBatch can be created.
TruckSearchSessions can be created.
Each TruckSearchSession stores owner_user_id.
Search statuses are tracked.
Worker logs can be stored.
```

## Example Commit Message

```txt
feat: add search session models
```

---

# 11. Phase 9 — Mock Search Worker

## Goal

Build the first working search flow without real load-board automation.

## Why This Comes Before Real Automation

```txt
It proves the product flow.
It allows frontend development.
It allows WebSocket testing.
It allows scoring and booking to be built early.
It avoids being blocked by scraping complexity.
```

## Build Items

```txt
Create MockSearchWorker
Create WorkerManager
Start one mock worker per TruckSearchSession
Simulate progress events
Generate mock load data
Store mock results
Mark search sessions completed
```

## Recommended Files

```txt
app/workers/mock_search_worker.py
app/workers/worker_manager.py
app/services/search_service.py
app/services/worker_log_service.py
```

## Mock Worker Flow

```txt
Start TruckSearchSession
Emit worker.started
Wait/simulate loading
Emit load_board.connected
Generate mock loads
Emit loads.found
Store loads
Emit worker.completed
Mark TruckSearchSession completed
```

## Done When

```txt
POST /searches/start creates a real SearchBatch.
TruckSearchSessions are created.
Mock workers run.
Mock worker logs are stored.
Search status changes from pending to running to completed.
```

## Example Commit Message

```txt
feat: implement mock search worker flow
```

---

# 12. Phase 10 — Load Result Storage

## Goal

Store loads, snapshots, and sources produced by mock searches.

## Build Tables

```txt
loads
load_snapshots
load_sources
```

## Build Items

```txt
Create Load model
Create LoadSnapshot model
Create LoadSource model
Create load deduplication utility
Create LoadService
Store mock loads
Return load results for TruckSearchSession
```

## Endpoints

```txt
GET /truck-search-sessions/{truck_search_session_id}/loads
GET /loads/{load_id}
GET /load-snapshots/{load_snapshot_id}
```

## Recommended Files

```txt
app/models/load.py
app/models/load_snapshot.py
app/models/load_source.py
app/services/load_service.py
app/api/v1/loads.py
app/schemas/load.py
app/utils/deduplication.py
```

## Done When

```txt
Mock worker stores Load records.
Mock worker stores LoadSnapshot records.
Mock worker stores LoadSource records.
Duplicate loads can be merged by deduplication key.
Frontend/API can fetch loads for a truck search.
```

## Example Commit Message

```txt
feat: add load result storage
```

---

# 13. Phase 11 — WebSocket Progress

## Goal

Stream live search progress to the frontend.

## Build Items

```txt
Create WebSocket connection manager
Create standard event format
Allow user to connect to company/search channel
Broadcast worker progress
Broadcast search completion
```

## WebSocket Endpoints

```txt
WS /ws/companies/{company_id}
WS /ws/searches/{search_batch_id}
```

## Recommended Files

```txt
app/api/v1/websockets.py
app/websockets/connection_manager.py
app/websockets/events.py
app/schemas/websocket.py
```

## Standard Event Shape

```txt
event_type
company_id
search_batch_id
truck_search_session_id
message
data
timestamp
```

## Done When

```txt
Frontend can connect to WebSocket.
Backend can broadcast search.started.
Backend can broadcast loads.found.
Backend can broadcast search.completed.
Mock search progress appears live.
```

## Example Commit Message

```txt
feat: add websocket search progress events
```

---

# 14. Phase 12 — Dispatcher Actions

## Goal

Allow dispatchers to act on search results.

## Build Table

```txt
dispatcher_actions
```

## Build Items

```txt
Save load
Reject load
Favorite load
Mark contacted
Store action history
Validate TruckSearchSession ownership
Prevent non-owner manipulation
```

## Endpoints

```txt
POST /truck-search-sessions/{truck_search_session_id}/loads/{load_id}/save
POST /truck-search-sessions/{truck_search_session_id}/loads/{load_id}/reject
POST /truck-search-sessions/{truck_search_session_id}/loads/{load_id}/favorite
POST /truck-search-sessions/{truck_search_session_id}/loads/{load_id}/contacted
```

## Recommended Files

```txt
app/models/dispatcher_action.py
app/api/v1/dispatcher_actions.py
app/services/dispatcher_action_service.py
app/schemas/dispatcher_action.py
app/core/permissions.py
```

## Done When

```txt
Owner dispatcher can save/reject/favorite/contact loads.
Non-owner dispatcher cannot manipulate active search results.
Action history is stored.
Load result state can show already saved/rejected/contacted.
```

## Example Commit Message

```txt
feat: add dispatcher load actions
```

---

# 15. Phase 13 — Booking Flow

## Goal

Allow dispatcher to book a selected load and store booking history.

## Build Table

```txt
booked_loads
```

## Build Items

```txt
Book selected load
Store posted rate
Store final negotiated rate
Connect booking to truck
Connect booking to driver
Connect booking to dispatcher
Update booking status
List company booked loads
```

## Endpoints

```txt
POST /loads/{load_id}/book
GET /companies/{company_id}/booked-loads
GET /booked-loads/{booked_load_id}
PATCH /booked-loads/{booked_load_id}
```

## Recommended Files

```txt
app/models/booked_load.py
app/api/v1/bookings.py
app/services/booking_service.py
app/schemas/booking.py
```

## Done When

```txt
Dispatcher can book a load.
Booked load is connected to truck, driver, dispatcher, and company.
Final negotiated rate is stored.
Booked load status can be updated.
Company booked-load history works.
```

## Example Commit Message

```txt
feat: add booked load workflow
```

---

# 16. Phase 14 — Rule-Based Scoring

## Goal

Rank load results using simple rule-based scoring.

## Build Tables

```txt
scoring_preferences
scoring_results
```

## Build Items

```txt
Create default scoring preferences
Allow dispatcher to update preferences
Calculate score for each LoadSnapshot
Store score result
Store score breakdown
Return ranked loads
```

## Endpoints

```txt
GET /companies/{company_id}/scoring-preferences/me
PATCH /companies/{company_id}/scoring-preferences/me
GET /load-snapshots/{load_snapshot_id}/score
```

## Recommended Files

```txt
app/models/scoring_preference.py
app/models/scoring_result.py
app/api/v1/scoring.py
app/services/scoring_service.py
app/schemas/scoring.py
```

## Initial Scoring Factors

```txt
Posted rate
Rate per mile
Mileage
Origin
Destination
Broker
Driver preferences
```

## Done When

```txt
Loads receive numeric scores.
Score breakdown is stored.
Results can be sorted by score.
Dispatcher preferences affect scoring.
```

## Example Commit Message

```txt
feat: add rule based load scoring
```

---

# 17. Phase 15 — AI Explanations

## Goal

Generate AI explanations for top-ranked loads.

## Build Table

```txt
ai_explanations
```

## Build Items

```txt
Select top 5–10 loads after scoring
Generate explanation
Store explanation
Return explanation with load result
Avoid regenerating existing explanations
```

## Recommended Files

```txt
app/models/ai_explanation.py
app/services/ai_explanation_service.py
app/schemas/ai.py
```

## Done When

```txt
Top loads receive AI explanations.
AI explanations are stored.
Existing explanations are reused.
Load results can show explanation text.
```

## Example Commit Message

```txt
feat: add ai explanations for top loads
```

---

# 18. Phase 16 — Frontend MVP Connection

## Goal

Connect backend MVP flow to frontend dashboard.

## Build Pages

```txt
Login page
Company selection page
Truck list page
Driver list page
Start search page
Live search progress page
Load results page
Booked loads page
```

## Frontend Flow

```txt
Login
        |
        v
Select company
        |
        v
View trucks
        |
        v
Start mock search
        |
        v
Watch live progress
        |
        v
Review loads
        |
        v
Save/reject/contact/book load
```

## Done When

```txt
Frontend can use real backend auth.
Frontend can start mock searches.
Frontend can display live progress.
Frontend can display ranked loads.
Frontend can book a load.
```

## Example Commit Message

```txt
feat: connect frontend to backend mvp flow
```

---

# 19. Phase 17 — Real Browser Automation

## Goal

Replace or extend mock search worker with real load-board browser automation.

## Build Items

```txt
Install Playwright
Create BrowserManager
Create browser context per load board
Load saved company session
Search real load boards
Parse real load results
Handle session expiration
Handle timeouts
Store real worker logs
```

## Recommended Files

```txt
app/workers/search_worker.py
app/workers/browser_manager.py
app/services/load_board_service.py
```

## Done When

```txt
Worker can open browser.
Worker can use saved session.
Worker can search at least one real board.
Worker can parse real load result.
Worker stores result in same Load/LoadSnapshot/LoadSource tables.
```

## Example Commit Message

```txt
feat: add initial browser automation worker
```

---

# 20. Phase 18 — MVP Testing & Stabilization

## Goal

Make sure the MVP flow works end-to-end.

## Test Scenarios

```txt
User registers
User logs in
User creates company
User creates truck
User creates driver
User assigns driver to truck
User starts mock search
Search creates sessions
Mock loads are generated
Loads are scored
Top loads get explanations
Dispatcher saves/rejects/contact load
Dispatcher books load
Booked load appears in history
Non-owner dispatcher cannot manipulate another search
```

## Recommended Tests

```txt
test_auth.py
test_companies.py
test_trucks.py
test_drivers.py
test_searches.py
test_loads.py
test_dispatcher_actions.py
test_bookings.py
```

## Done When

```txt
Core MVP flow works without manual database editing.
Major endpoints tested.
Permissions tested.
Mock search works reliably.
Frontend/backend flow is demo-ready.
```

## Example Commit Message

```txt
test: add mvp flow integration tests
```

---

# 21. MVP Completion Definition

The MVP is considered working when:

```txt
A dispatcher can register and log in.
A dispatcher can create/select a company.
A dispatcher can create trucks and drivers.
A dispatcher can assign a driver to a truck.
A dispatcher can start a search for one or more trucks.
The system creates SearchBatch and TruckSearchSessions.
Mock workers generate realistic load results.
Loads are deduplicated and stored.
Loads are ranked with rule-based scoring.
Top loads include AI explanations.
Dispatcher can save, reject, favorite, or mark loads as contacted.
Dispatcher can book a load.
Booked load history is stored.
Search progress is visible in real time.
Other dispatchers can observe company state.
Only the owner dispatcher can manipulate active search results.
```

---

# 22. Things Intentionally Delayed

These should not block the first MVP:

```txt
Perfect browser automation
Advanced load-board parsing
Complex admin roles
Advanced analytics
Billing system
Mobile app
Complex notification system
Advanced AI dispatching agent
Multi-tenant enterprise permissions
Full CRM features
```

Reason:

```txt
The first MVP should prove the core dispatching workflow before adding advanced systems.
```

---

# 23. Recommended Commit Strategy

Commit after each meaningful phase.

Example commits:

```txt
setup: initialize FastAPI backend structure
setup: configure database and migrations
feat: add user company membership models
feat: implement jwt authentication
feat: add company and membership management
feat: add truck and driver management
feat: add load board session records
feat: add search session models
feat: implement mock search worker flow
feat: add load result storage
feat: add websocket search progress events
feat: add dispatcher load actions
feat: add booked load workflow
feat: add rule based load scoring
feat: add ai explanations for top loads
test: add mvp flow integration tests
```

---

# 24. Recommended First Development Sprint

## Sprint Goal

Build the smallest backend foundation that can run.

## Sprint Tasks

```txt
Create backend folder
Create FastAPI app
Add health check endpoint
Add config system
Add database connection
Add Alembic
Add User model
Add Company model
Add CompanyMembership model
Create first migration
Commit setup
```

## Sprint Success

```txt
Backend runs.
Database connects.
First migration works.
Repo has clean structure.
Docs are committed.
```
