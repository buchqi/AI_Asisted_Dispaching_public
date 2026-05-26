# AI-Assisted Dispatching MVP — API Endpoint Plan

This document defines the first version of the FastAPI endpoint plan for the AI-assisted dispatching MVP.

The goal of this file is not to describe every implementation detail. The goal is to give enough structure to start building the backend without overdesigning too early.

Each endpoint is described with:

- **Purpose** — why the endpoint exists
- **Main actions** — what the backend should do internally
- **Returns** — what the frontend should receive

---

## 1. Auth Endpoints

Auth endpoints handle user registration, login, and current-user lookup.

### POST `/auth/register`

**Purpose:**  
Create a new user account.

**Main actions:**

- Validate email, password, name, phone, and timezone
- Check if email is already registered
- Hash password
- Create user record
- Optionally create first company if this is a company owner/admin signup

**Returns:**

- User info
- Access token
- Selected/default company if available

---

### POST `/auth/login`

**Purpose:**  
Authenticate an existing user.

**Main actions:**

- Validate email and password
- Check user exists
- Verify password hash
- Generate access token
- Load user company memberships

**Returns:**

- Access token
- User info
- List of companies the user belongs to

---

### GET `/auth/me`

**Purpose:**  
Return currently authenticated user.

**Main actions:**

- Read user from JWT/session
- Load basic profile info
- Load company memberships

**Returns:**

- Current user info
- Companies user belongs to
- Current active company if selected

---

## 2. Company & Membership Endpoints

These endpoints manage companies and users inside companies.

### POST `/companies`

**Purpose:**  
Create a new dispatch company.

**Main actions:**

- Create company record
- Add current user as admin member
- Store company name and basic profile

**Returns:**

- Created company info
- Current user's membership role

---

### GET `/companies`

**Purpose:**  
List companies where the current user is a member.

**Main actions:**

- Find memberships for current user
- Load related company info

**Returns:**

- List of companies
- User role in each company

---

### GET `/companies/{company_id}`

**Purpose:**  
Get details for one company.

**Main actions:**

- Check user belongs to company
- Load company data
- Load simple company statistics if useful later

**Returns:**

- Company details

---

### GET `/companies/{company_id}/members`

**Purpose:**  
List all users in a company.

**Main actions:**

- Check current user belongs to company
- Load company members
- Include role and status

**Returns:**

- List of company members

---

### POST `/companies/{company_id}/members/invite`

**Purpose:**  
Invite a dispatcher/user to a company.

**Main actions:**

- Check current user is company admin
- Create invitation or membership record
- Store invited email and role
- Later this can send email invitation

**Returns:**

- Invitation info or created membership info

---

### DELETE `/companies/{company_id}/members/{user_id}`

**Purpose:**  
Remove a user from a company.

**Main actions:**

- Check current user is company admin
- Prevent removing final admin
- Remove or deactivate membership

**Returns:**

- Success message

---

## 3. Truck Endpoints

Truck endpoints manage company trucks. The `truck_id` is the internal company truck number, not the database ID.

### POST `/companies/{company_id}/trucks`

**Purpose:**  
Create a new truck for a company.

**Main actions:**

- Check user belongs to company
- Validate internal truck number is unique inside company
- Save truck info
- Optionally assign current driver

**Returns:**

- Created truck info

---

### GET `/companies/{company_id}/trucks`

**Purpose:**  
List all trucks in a company.

**Main actions:**

- Check company membership
- Load trucks
- Include current driver display information
- Include current truck status

**Returns:**

- List of company trucks

---

### GET `/companies/{company_id}/trucks/{truck_db_id}`

**Purpose:**  
Get one truck with full details.

**Main actions:**

- Check company membership
- Load truck
- Load assigned driver if exists
- Load recent status/search info if useful

**Returns:**

- Truck details
- Current driver info

---

### PATCH `/companies/{company_id}/trucks/{truck_db_id}`

**Purpose:**  
Update truck information.

**Main actions:**

- Check company membership
- Update truck number, equipment type, status, notes, etc.
- If driver changed, update assignment info

**Returns:**

- Updated truck info

---

### DELETE `/companies/{company_id}/trucks/{truck_db_id}`

**Purpose:**  
Remove or deactivate a truck.

**Main actions:**

- Check company membership
- Soft-delete or deactivate truck
- Preserve historical booked load/search data

**Returns:**

- Success message

---

## 4. Driver Endpoints

Driver endpoints manage driver profiles, preferences, and assignments.

### POST `/companies/{company_id}/drivers`

**Purpose:**  
Create a driver profile.

**Main actions:**

- Check company membership
- Save driver name, surname, phone, notes, and preferences
- Optionally assign to a truck

**Returns:**

- Created driver info

---

### GET `/companies/{company_id}/drivers`

**Purpose:**  
List company drivers.

**Main actions:**

- Check company membership
- Load all active drivers
- Include assigned truck if available

**Returns:**

- List of drivers

---

### GET `/companies/{company_id}/drivers/{driver_id}`

**Purpose:**  
Get full driver profile.

**Main actions:**

- Check company membership
- Load driver info
- Load current truck assignment
- Load preferences

**Returns:**

- Driver profile
- Preferences
- Current assignment

---

### PATCH `/companies/{company_id}/drivers/{driver_id}`

**Purpose:**  
Update driver profile or preferences.

**Main actions:**

- Check company membership
- Update driver personal info
- Update driver preferences

**Returns:**

- Updated driver info

---

### POST `/companies/{company_id}/drivers/{driver_id}/assign-truck`

**Purpose:**  
Assign or reassign a driver to a truck.

**Main actions:**

- Check company membership
- Update current truck assignment
- Preserve history of previous assignments
- Update truck current driver display info

**Returns:**

- Updated driver assignment
- Updated truck info

---

## 5. Load Board Session Endpoints

These endpoints manage company-level load-board login/session state.

### GET `/companies/{company_id}/load-boards`

**Purpose:**  
List load boards connected to the company.

**Main actions:**

- Check company membership
- Load configured load boards
- Include session health/status

**Returns:**

- List of load boards
- Session status for each board

---

### POST `/companies/{company_id}/load-boards`

**Purpose:**  
Add a load board connection to a company.

**Main actions:**

- Check company admin or allowed user
- Create company load-board record
- Store board type/name
- Mark session as not logged in yet

**Returns:**

- Created load-board connection

---

### PATCH `/companies/{company_id}/load-boards/{load_board_id}`

**Purpose:**  
Update load-board configuration.

**Main actions:**

- Check permission
- Update board settings
- Update active/inactive status

**Returns:**

- Updated load-board connection

---

### POST `/companies/{company_id}/load-boards/{load_board_id}/session/start-login`

**Purpose:**  
Start login flow for a load board session.

**Main actions:**

- Check permission
- Start server-side browser session
- Allow user/company to log in normally
- Store session/cookies after successful login

**Returns:**

- Login session status
- Browser/login flow info if needed by frontend

---

### GET `/companies/{company_id}/load-boards/{load_board_id}/session/health`

**Purpose:**  
Check if load-board session is healthy.

**Main actions:**

- Check stored session
- Optionally test if session still works
- Return whether relogin is required

**Returns:**

- Session health status
- Expiration/relogin information

---

## 6. Search Endpoints

Search endpoints start and monitor search batches and truck search sessions.

### POST `/companies/{company_id}/search-batches`

**Purpose:**  
Start a new search batch for one or multiple trucks.

**Main actions:**

- Check company membership
- Validate selected trucks
- Create `SearchBatch`
- Create one `TruckSearchSession` per selected truck
- Store search filter snapshots
- Lock each truck search to the owner dispatcher
- Start background workers
- Begin WebSocket progress events

**Returns:**

- Search batch ID
- Created truck search session IDs
- Initial status

---

### GET `/companies/{company_id}/search-batches`

**Purpose:**  
List search batches for a company.

**Main actions:**

- Check company membership
- Load recent search batches
- Include status and who started them

**Returns:**

- List of search batches

---

### GET `/companies/{company_id}/search-batches/{search_batch_id}`

**Purpose:**  
Get details for one search batch.

**Main actions:**

- Check company membership
- Load search batch
- Load related truck search sessions
- Include current status of each truck search

**Returns:**

- Search batch details
- Truck search sessions

---

### GET `/companies/{company_id}/truck-search-sessions/{truck_search_session_id}`

**Purpose:**  
Get one truck search session.

**Main actions:**

- Check company membership
- Load session status
- Load owner dispatcher
- Load truck and search filters

**Returns:**

- Truck search session details

---

### POST `/companies/{company_id}/truck-search-sessions/{truck_search_session_id}/cancel`

**Purpose:**  
Cancel an active truck search.

**Main actions:**

- Check current user is owner dispatcher or admin
- Stop/cancel background worker if still running
- Mark session as cancelled
- Emit WebSocket update

**Returns:**

- Updated truck search session status

---

## 7. Load Result Endpoints

These endpoints expose found loads, snapshots, sources, and ranked results.

### GET `/companies/{company_id}/truck-search-sessions/{truck_search_session_id}/loads`

**Purpose:**  
Get ranked load results for a truck search.

**Main actions:**

- Check company membership
- Load deduplicated loads for this truck search
- Include latest snapshot data
- Include source boards
- Include scoring result if available
- Include AI explanation if available

**Returns:**

- Ranked list of loads
- Score breakdown
- AI explanation for top loads if generated

---

### GET `/companies/{company_id}/loads/{load_id}`

**Purpose:**  
Get detailed information about one load.

**Main actions:**

- Check company membership
- Load stable load identity
- Load latest snapshot
- Load all source board records
- Load dispatcher actions on this load

**Returns:**

- Full load details
- Raw details if allowed
- Sources
- Actions/history

---

### GET `/companies/{company_id}/loads/{load_id}/snapshots`

**Purpose:**  
View historical snapshots for a load.

**Main actions:**

- Check company membership
- Load previous search-time snapshots
- Show how rate/details changed over time

**Returns:**

- List of load snapshots

---

## 8. Dispatcher Action Endpoints

These endpoints store dispatcher decisions on loads.

### POST `/companies/{company_id}/loads/{load_id}/actions/save`

**Purpose:**  
Save a load for later review.

**Main actions:**

- Check company membership
- Check whether current user owns the active truck search if action is tied to active session
- Store save action

**Returns:**

- Updated action state for the load

---

### POST `/companies/{company_id}/loads/{load_id}/actions/favorite`

**Purpose:**  
Mark a load as favorite.

**Main actions:**

- Check company membership
- Store favorite action
- Allow frontend to highlight the load

**Returns:**

- Updated action state

---

### POST `/companies/{company_id}/loads/{load_id}/actions/reject`

**Purpose:**  
Reject a load.

**Main actions:**

- Check company membership
- Check owner dispatcher if inside active search session
- Store rejection action
- Store optional rejection reason

**Returns:**

- Updated action state
- Rejection reason if provided

---

### POST `/companies/{company_id}/loads/{load_id}/actions/contacted`

**Purpose:**  
Mark broker/contact as contacted.

**Main actions:**

- Check company membership
- Store contacted action
- Store notes if provided
- Store timestamp

**Returns:**

- Updated action state

---

### GET `/companies/{company_id}/loads/{load_id}/actions`

**Purpose:**  
View actions/history for a load.

**Main actions:**

- Check company membership
- Load actions from dispatchers
- Show timestamps, notes, and action types

**Returns:**

- Load action history

---

## 9. Booked Load Endpoints

Booked load endpoints store final accepted/negotiated loads historically.

### POST `/companies/{company_id}/loads/{load_id}/book`

**Purpose:**  
Book a selected load.

**Main actions:**

- Check company membership
- Check current user can manipulate the active truck search
- Create booked load record
- Store dispatcher, driver, truck, final negotiated rate, mileage, broker info, and source board
- Update load action state to booked
- Update truck status if needed
- Emit WebSocket update

**Returns:**

- Created booked load
- Updated truck/load status

---

### GET `/companies/{company_id}/booked-loads`

**Purpose:**  
List booked loads for a company.

**Main actions:**

- Check company membership
- Load booked load history
- Support filters later: truck, driver, dispatcher, status, date range

**Returns:**

- List of booked loads

---

### GET `/companies/{company_id}/booked-loads/{booked_load_id}`

**Purpose:**  
Get one booked load in detail.

**Main actions:**

- Check company membership
- Load booked load
- Load related driver, truck, dispatcher, source load, and final rate

**Returns:**

- Booked load details

---

### PATCH `/companies/{company_id}/booked-loads/{booked_load_id}`

**Purpose:**  
Update booked load status or final operational info.

**Main actions:**

- Check company membership
- Update status: booked, picked_up, delivered, cancelled
- Update notes or final rate if needed
- Keep history/audit trail later if required

**Returns:**

- Updated booked load

---

## 10. Scoring Preference Endpoints

Scoring preferences are per-dispatcher because dispatcher-driver relationships and priorities can be different.

### GET `/companies/{company_id}/scoring-preferences/me`

**Purpose:**  
Get current dispatcher's scoring preferences.

**Main actions:**

- Check company membership
- Load preferences for current user inside company
- Return defaults if not configured

**Returns:**

- Current scoring preferences

---

### PUT `/companies/{company_id}/scoring-preferences/me`

**Purpose:**  
Create or update current dispatcher's scoring preferences.

**Main actions:**

- Check company membership
- Save priority weights
- Store preferred lanes, minimum rate, max deadhead, broker preferences, etc.

**Returns:**

- Updated scoring preferences

---

### POST `/companies/{company_id}/truck-search-sessions/{truck_search_session_id}/rescore`

**Purpose:**  
Recalculate scores for loads in a truck search.

**Main actions:**

- Check company membership
- Check current user owns the search or is allowed
- Re-run rule-based scoring
- Update score breakdowns
- Optionally regenerate AI explanations for top results

**Returns:**

- Rescore status
- Updated top results summary

---

## 11. AI Explanation Endpoints

AI explanations are generated after rule-based scoring, mostly for top-ranked loads.

### POST `/companies/{company_id}/truck-search-sessions/{truck_search_session_id}/ai-explanations/generate`

**Purpose:**  
Generate AI explanations for top loads in a truck search.

**Main actions:**

- Check company membership
- Load top 5–10 scored loads
- Send scoring context and load data to AI service
- Store generated explanations
- Emit WebSocket update when complete

**Returns:**

- Generation status
- Explanation count

---

### GET `/companies/{company_id}/loads/{load_id}/ai-explanation`

**Purpose:**  
Get stored AI explanation for one load.

**Main actions:**

- Check company membership
- Load explanation if it exists
- Do not regenerate automatically unless explicitly requested

**Returns:**

- AI explanation text
- Explanation metadata

---

## 12. Worker Log Endpoints

These are useful for debugging scraping/search problems.

### GET `/companies/{company_id}/truck-search-sessions/{truck_search_session_id}/worker-logs`

**Purpose:**  
View logs for a truck search worker.

**Main actions:**

- Check company membership
- Load worker/search logs
- Include board-specific errors and progress

**Returns:**

- Worker log entries

---

### GET `/companies/{company_id}/search-batches/{search_batch_id}/worker-logs`

**Purpose:**  
View logs for all truck searches inside a search batch.

**Main actions:**

- Check company membership
- Load all logs related to the batch
- Group logs by truck search session and load board

**Returns:**

- Grouped worker logs

---

## 13. WebSocket Endpoints

WebSocket endpoints are used for live search progress updates.

### WS `/ws/companies/{company_id}/search-batches/{search_batch_id}`

**Purpose:**  
Stream live progress for a search batch.

**Main actions:**

- Authenticate user
- Check user belongs to company
- Subscribe user to search batch events
- Push live updates as workers progress

**Returns / Sends events:**

- `search.started`
- `truck_search.started`
- `load_board.connected`
- `load_board.failed`
- `loads.found`
- `loads.deduplicated`
- `scoring.completed`
- `ai_explanations.completed`
- `search.completed`
- `search.failed`
- `search.cancelled`

---

### WS `/ws/companies/{company_id}/trucks/{truck_id}`

**Purpose:**  
Stream live truck-specific updates.

**Main actions:**

- Authenticate user
- Check user belongs to company
- Subscribe to truck updates
- Push search/status changes for that truck

**Returns / Sends events:**

- Truck status changed
- Truck search started
- Truck search completed
- Load booked for truck
- Driver assignment changed

---

## 14. Recommended MVP Build Order

This is the recommended implementation order.

### Phase 1 — Backend skeleton

- Create FastAPI app
- Create project folders
- Add database connection
- Add base models
- Add simple health endpoint

### Phase 2 — Auth and company structure

- Auth register/login/me
- Company creation
- Memberships
- Simple admin role

### Phase 3 — Core dispatch data

- Trucks
- Drivers
- Driver assignment
- Load-board connection records

### Phase 4 — Search system with mock data

- Create search batch
- Create truck search sessions
- Use fake/mock load data first
- Store loads, snapshots, and sources
- Return ranked results

### Phase 5 — WebSocket progress

- Add live progress events
- Simulate worker progress with mock workers
- Connect frontend dashboard later

### Phase 6 — Dispatcher actions and booking

- Save/favorite/reject/contacted actions
- Book load
- Store booked load history

### Phase 7 — Scoring and AI

- Rule-based scoring
- Score breakdowns
- Dispatcher scoring preferences
- AI explanations for top loads

### Phase 8 — Real browser automation

- Add server-side browser workers
- Add load-board session handling
- Add timeout/error handling
- Replace mock workers gradually

---

## 15. Notes for Development

Do not try to fully implement all endpoint logic immediately.

Recommended first backend version:

- Make routers
- Make request/response schemas
- Make endpoints return dummy data
- Then connect database models one by one
- Then add services
- Then add real workers

This prevents the project from becoming too complex too early.

