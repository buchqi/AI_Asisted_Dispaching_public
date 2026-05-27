# Frontend / Backend Architecture

This document describes the current Next.js frontend architecture and how it connects to the FastAPI backend. Keep it updated after each major phase so development can continue without rediscovering contracts.

## 1. Frontend Folder Architecture

### `app/`
Next.js route ownership only. Route files should stay small and import feature-level screens.

Examples:
- `app/login/page.tsx`
- `app/register/page.tsx`
- `app/companies/page.tsx`
- `app/dispatch/page.tsx`
- `app/trucks/page.tsx`
- `app/drivers/page.tsx`
- `app/search/page.tsx`

Route files should not own business logic, API calls, or large UI trees.

### `components/`
Reusable UI and layout components only.

- `components/ui/`: pure reusable UI such as badges, icon buttons, utilities.
- `components/layout/`: app shell, sidebar, topbar, authenticated layout pieces.

No domain/business logic should live here.

### `features/`
Domain and workflow UI. Feature components can own page-level UI logic, forms, state local to a workflow, and calls into `api/`.

Important current folders:
- `features/auth/`: login/register forms, auth gate, route protection.
- `features/companies/`: company workspace, active company profile, invites, members.
- `features/trucks/`: truck route ownership currently delegates to dispatch operational screens.
- `features/drivers/`: driver route ownership currently delegates to dispatch operational screens.
- `features/dispatch/`: authenticated dispatch shell and operational screens.
- `features/search/`: search control center, session cards, ranked score results table.
- `features/loads/`: load filters/table/drawer UI. Live Loads is not raw search results.

### `api/`
FastAPI request functions only. This is the only frontend layer that should call `apiClient`.

Examples:
- `api/auth-api.ts`
- `api/companies-api.ts`
- `api/company-members-api.ts`
- `api/trucks-api.ts`
- `api/drivers-api.ts`
- `api/search-api.ts`

Components should not call `fetch` directly.

### `store/`
Global client state only.

Current important stores:
- `store/auth-store.ts`: current user/session/token initialization state.
- `store/company-store.ts`: companies list, active company, `activeCompanyId`.
- `store/workspace-store.ts`: app workspace UI state and navigation state.

Do not put temporary form state here.

### `types/`
TypeScript contracts shared by API modules and features.

Examples:
- `types/auth.ts`
- `types/companies.ts`
- `types/trucks.ts`
- `types/drivers.ts`
- `types/search.ts`

Backend response shape changes should usually be reflected here.

## 2. Environment / API Client

### Environment Variable

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

If the variable is missing, `api/api-client.ts` falls back to:

```text
http://localhost:8000
```

### `api/api-client.ts`

Responsibilities:
- Builds requests against `NEXT_PUBLIC_API_BASE_URL`.
- Attaches `Authorization: Bearer <token>` when a token exists.
- Sends JSON request bodies with `Content-Type: application/json`.
- Parses JSON responses.
- Throws `ApiError` for non-2xx responses.
- Extracts useful backend error messages from `detail`, `message`, or FastAPI validation arrays.

Token helpers:
- `getAccessToken()`
- `setAccessToken(token)`
- `clearAccessToken()`

Rule: TSX components should call domain API functions, not `fetch`. This keeps auth headers, JSON handling, and errors consistent.

## 3. Auth Flow

Frontend files:
- API: `api/auth-api.ts`
- Store/context: `store/auth-store.ts`
- Forms: `features/auth/auth-form.tsx`
- Gate/protection: `features/auth/auth-gate.tsx`
- Routes: `app/login/page.tsx`, `app/register/page.tsx`

### `POST /auth/register`

Frontend function:

```ts
authApi.register(payload)
```

Request body:

```json
{
  "email": "user@example.com",
  "password": "string",
  "first_name": "string",
  "last_name": "string",
  "phone": "string",
  "timezone": "America/New_York"
}
```

Expected response:
- Access token if backend returns it.
- User/session data depending on backend response.

Where stored:
- Access token: `localStorage`, via `setAccessToken`.
- User/session state: `store/auth-store.ts`.

Called by:
- Register mode in `features/auth/auth-form.tsx`.

### `POST /auth/login`

Frontend function:

```ts
authApi.login(payload)
```

Request body:

```json
{
  "email": "user@example.com",
  "password": "string"
}
```

Expected response:
- Access token.
- User/session data depending on backend response.

Where stored:
- Access token in `localStorage`.
- Auth state in `store/auth-store.ts`.

Called by:
- Login mode in `features/auth/auth-form.tsx`.

### `GET /auth/me`

Frontend function:

```ts
authApi.getMe()
```

Request body: none.

Expected response:

```json
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "string",
  "last_name": "string",
  "phone": "string",
  "timezone": "string"
}
```

Where stored:
- `store/auth-store.ts` as `user`.

Called by:
- Auth initialization in `store/auth-store.ts`.
- Route protection through `features/auth/auth-gate.tsx`.

Auth route behavior:
- Unauthenticated users redirect to `/login`.
- Authenticated users opening `/login` or `/register` redirect into the app.
- Company-scoped app routes also require `activeCompanyId`.

## 4. Company Workspace Flow

Frontend files:
- API: `api/companies-api.ts`
- Members API: `api/company-members-api.ts`
- Store: `store/company-store.ts`
- UI: `features/companies/companies-page.tsx`
- Route: `app/companies/page.tsx`

### `GET /companies`

Frontend function:

```ts
companiesApi.listCompanies()
```

Request body: none.

Expected response:

```json
[
  {
    "id": 2,
    "name": "Fleet Company",
    "...": "other backend fields"
  }
]
```

Used by:
- `store/company-store.ts`
- `features/companies/companies-page.tsx`

Purpose:
- Load companies available to the authenticated user.
- Auto-select single company when possible.
- Resolve stored `activeCompanyId`.

### `POST /companies`

Frontend function:

```ts
companiesApi.createCompany(payload)
```

Request body:

```json
{
  "name": "Fleet Company"
}
```

Expected response:

```json
{
  "id": 2,
  "name": "Fleet Company"
}
```

Used by:
- `store/company-store.ts`
- `features/companies/companies-page.tsx`

Purpose:
- Create first company from Companies page.
- Automatically set created company as active.

### `GET /companies/{company_id}`

Frontend function:

```ts
companiesApi.getCompany(companyId)
```

Request body: none.

Expected response:

```json
{
  "id": 2,
  "name": "Fleet Company"
}
```

Purpose:
- Fetch one company when detailed company data is needed.

### `POST /companies/{company_id}/members/invite`

Frontend function:

```ts
companyMembersApi.inviteCompanyMember(companyId, payload)
```

Request body:

```json
{
  "email": "dispatcher@example.com",
  "role": "dispatcher"
}
```

Expected response:

```json
{
  "id": 5,
  "user_id": 4,
  "company_id": 2,
  "role": "dispatcher",
  "status": "active",
  "user": {
    "id": 4,
    "email": "dispatcher@example.com",
    "first_name": "Giorgi",
    "last_name": "Tkebuchava",
    "phone": "optional",
    "timezone": "optional"
  }
}
```

Used by:
- Invite panel in `features/companies/companies-page.tsx`.

Purpose:
- Add an already registered user to active company.
- Refresh member list after invite.

### `GET /companies/{company_id}/members`

Frontend function:

```ts
companyMembersApi.listCompanyMembers(companyId)
```

Expected response:

```json
[
  {
    "id": 5,
    "user_id": 4,
    "company_id": 2,
    "role": "dispatcher",
    "status": "active",
    "user": {
      "id": 4,
      "email": "dispatcher@example.com",
      "first_name": "Giorgi",
      "last_name": "Tkebuchava",
      "phone": "optional",
      "timezone": "optional"
    }
  }
]
```

Used by:
- Members table in `features/companies/companies-page.tsx`.

Notes:
- Backend returns nested `user`.
- Frontend defensively handles missing nested user during transitions.
- Removed members are hidden by backend where possible and defensively filtered in frontend.

### `PATCH /companies/{company_id}/members/{membership_id}`

Frontend function:

```ts
companyMembersApi.updateCompanyMember(companyId, membershipId, payload)
```

Request body:

```json
{
  "role": "admin"
}
```

or:

```json
{
  "role": "dispatcher"
}
```

Expected response:
- Updated membership with nested user.

Used by:
- Promote/demote member actions.

### `DELETE /companies/{company_id}/members/{membership_id}`

Frontend function:

```ts
companyMembersApi.removeCompanyMember(companyId, membershipId)
```

Expected response:
- Removed/updated membership.

Used by:
- Remove/kick member action.

Company state:
- `activeCompanyId` is stored in `localStorage`.
- `store/company-store.ts` owns `companies`, `activeCompany`, `activeCompanyId`, loading, and errors.
- Company-scoped pages redirect to `/companies` if authenticated but no active company is selected.

Current Companies page behavior:
- Page title uses active company name.
- Header badge shows active/non-removed member count.
- Invite panel allows adding registered users.
- Members list shows name/email/role/status/actions.
- Promote/demote/remove refreshes members after success.

## 5. Trucks Flow

Frontend files:
- API: `api/trucks-api.ts`
- Types: `types/trucks.ts`
- UI: trucks screen currently in `features/dispatch/operational-screens.tsx`
- Route: `app/trucks/page.tsx`

### `GET /companies/{company_id}/trucks`

Frontend function:

```ts
trucksApi.listTrucks(companyId)
```

Request body: none.

Expected response:

```json
[
  {
    "id": 5,
    "company_id": 2,
    "truck_id": "231",
    "current_driver_id": 2,
    "current_driver_name": "giorgi",
    "current_driver_surname": "shurgia",
    "equipment_type": "dry_van",
    "status": "available",
    "current_location": "Atlanta, GA",
    "available_from": "2026-05-27",
    "max_deadhead_miles": 150,
    "min_rpm": 2.35,
    "max_weight": 42000,
    "preferred_broker_sources": ["DAT", "Truckstop"],
    "notes": "string"
  }
]
```

Used by:
- Trucks page.
- Dispatch search truck selector.
- Drivers page when displaying linked trucks.

### `POST /companies/{company_id}/trucks`

Frontend function:

```ts
trucksApi.createTruck(companyId, payload)
```

Request body:

```json
{
  "truck_id": "231",
  "current_driver_id": 2,
  "equipment_type": "dry_van",
  "status": "available",
  "current_location": "Atlanta, GA",
  "available_from": "2026-05-27",
  "max_deadhead_miles": 150,
  "min_rpm": 2.35,
  "max_weight": 42000,
  "preferred_broker_sources": ["DAT", "Truckstop"],
  "notes": "string"
}
```

Response body:
- Created truck with all expanded fields.

Used by:
- Create truck form in Trucks page.

### `GET /companies/{company_id}/trucks/{truck_id}`

Frontend function:

```ts
trucksApi.getTruck(companyId, truckDbId)
```

Important:
- Route param uses database truck id (`id`), not human-facing `truck_id`.

Response body:
- One truck with expanded fields.

### `PATCH /companies/{company_id}/trucks/{truck_id}`

Frontend function:

```ts
trucksApi.updateTruck(companyId, truckDbId, payload)
```

Request body:
- Partial truck fields.

Example:

```json
{
  "status": "available",
  "current_location": "Atlanta, GA",
  "min_rpm": 2.5
}
```

Response body:
- Updated truck with expanded fields.

Used by:
- Edit truck form.
- Truck status updates.
- Current driver assignment via `current_driver_id`.

Expanded truck profile fields:
- `truck_id`: human-facing truck/unit number.
- `current_driver_id`: optional DB driver id.
- `current_driver_name`: denormalized display field from backend.
- `current_driver_surname`: denormalized display field from backend.
- `equipment_type`
- `status`
- `current_location`
- `available_from`
- `max_deadhead_miles`
- `min_rpm`
- `max_weight`
- `preferred_broker_sources`
- `notes`

Search notes:
- These fields are search defaults.
- One-click search depends on truck profile.
- Create/edit truck forms save these fields.
- Old trucks may have null values after migration; frontend must display nulls defensively.

## 6. Drivers Flow

Frontend files:
- API: `api/drivers-api.ts`
- Types: `types/drivers.ts`
- UI: drivers screen currently in `features/dispatch/operational-screens.tsx`
- Route: `app/drivers/page.tsx`

### `GET /companies/{company_id}/drivers`

Frontend function:

```ts
driversApi.listDrivers(companyId)
```

Request body: none.

Expected response:

```json
[
  {
    "id": 7,
    "company_id": 2,
    "first_name": "Giorgi",
    "last_name": "Shurgia",
    "phone": "string",
    "email": "driver@example.com",
    "home_location": "Atlanta, GA",
    "preferences": "string",
    "notes": "string",
    "status": "active"
  }
]
```

Used by:
- Drivers page.
- Trucks page driver dropdown.

### `POST /companies/{company_id}/drivers`

Frontend function:

```ts
driversApi.createDriver(companyId, payload)
```

Request body:

```json
{
  "first_name": "string",
  "last_name": "string",
  "phone": "string",
  "email": "user@example.com",
  "home_location": "string",
  "preferences": "string",
  "notes": "string"
}
```

Response body:
- Created driver.

Used by:
- Create driver form in Drivers page.

### `GET /companies/{company_id}/drivers/{driver_id}`

Frontend function:

```ts
driversApi.getDriver(companyId, driverId)
```

Response body:
- One driver.

### `PATCH /companies/{company_id}/drivers/{driver_id}`

Frontend function:

```ts
driversApi.updateDriver(companyId, driverId, payload)
```

Request body:
- Partial driver fields, including optional `status`.

Response body:
- Updated driver.

Used by:
- Driver status updates.

## 7. Dispatch Workspace / Search Phase 5A

Frontend files:
- API: `api/search-api.ts`
- Types: `types/search.ts`
- Control center: `features/search/search-control-center.tsx`
- Workspace shell: `features/dispatch/dispatch-workspace.tsx`

Concepts:
- `SearchBatch`: one dispatcher search action.
- `TruckSearchSession`: one truck's search process inside a batch.
- `filters_snapshot`: frozen search filters used during that search.
- One truck = one active search session.
- Active statuses: `pending`, `running`.
- Final statuses: `completed`, `failed`, `canceled`, `cancelled`, `timeout`.
- `is_hidden`: soft-hide old sessions from current UI/history without hard-deleting data.

### `POST /searches/start`

Frontend function:

```ts
searchApi.startSearch(payload)
```

Final request body:

```json
{
  "company_id": 2,
  "truck_ids": [5],
  "overrides": {
    "min_rpm": 2.5,
    "preferred_broker_sources": ["DAT"]
  },
  "timeout_seconds": 120
}
```

Response body:

```json
{
  "id": 16,
  "company_id": 2,
  "created_by_user_id": 2,
  "status": "pending",
  "filters_snapshot": {
    "truck_ids": [5],
    "overrides": {}
  },
  "total_trucks": 1,
  "completed_trucks": 0,
  "failed_trucks": 0,
  "timeout_seconds": 120,
  "started_at": null,
  "completed_at": null,
  "created_at": "...",
  "updated_at": "..."
}
```

Used by:
- Start Search button in `features/search/search-control-center.tsx`.

Backend behavior:
- Loads truck profile.
- Validates truck status.
- Blocks non-available truck statuses with specific messages.
- Blocks active same-truck sessions.
- Merges truck defaults and overrides.
- Creates `filters_snapshot`.
- Hides old final sessions for the same truck.
- Creates new `SearchBatch` and `TruckSearchSession`.

### `GET /searches/{search_batch_id}`

Frontend function:

```ts
searchApi.getSearchBatch(searchBatchId)
```

Purpose:
- Refresh tracked search batch metadata.

### `GET /searches/{search_batch_id}/truck-sessions`

Frontend function:

```ts
searchApi.getTruckSessionsForBatch(searchBatchId)
```

Response body:

```json
[
  {
    "id": 20,
    "search_batch_id": 16,
    "company_id": 2,
    "truck_id": 5,
    "owner_user_id": 2,
    "status": "running",
    "filters_snapshot": {},
    "timeout_seconds": 120,
    "started_at": "...",
    "completed_at": null,
    "error_message": null,
    "created_at": "...",
    "updated_at": "..."
  }
]
```

Purpose:
- Session list polling.
- Newly started search fetches this immediately after `POST /searches/start`.

### `GET /truck-search-sessions/{truck_search_session_id}`

Frontend function:

```ts
searchApi.getTruckSearchSession(sessionId)
```

Purpose:
- Fetch one session when needed.

### `POST /truck-search-sessions/{truck_search_session_id}/cancel`

Frontend function:

```ts
searchApi.cancelTruckSearchSession(sessionId)
```

Purpose:
- Cancel active session.

### `DELETE /truck-search-sessions/{truck_search_session_id}`

Frontend function:

```ts
searchApi.deleteTruckSearchSession(sessionId)
```

Purpose:
- Soft-clear final sessions from visible UI/history.
- Backend sets `is_hidden = true`.
- Active sessions cannot be deleted; user must cancel first.

Frontend session behavior:
- `localStorage` stores recent batch ids under `freight-command-search-batch-ids`.
- Polling runs every 4 seconds while visible sessions include active statuses.
- Polling stops when all visible sessions are final.
- Stale batch ids are pruned when they return no visible sessions.
- UI displays only newest visible session per truck.
- Search request uses database truck id: `truck_ids: [truck.id]`.
- UI displays human truck label: `truck.truck_id`.

## 8. Search Results / Scores Phase 5B

Backend endpoint:

```http
GET /truck-search-sessions/{truck_search_session_id}/scores
```

Frontend function:

```ts
searchApi.getTruckSearchSessionScores(sessionId)
```

Expected response item:

```json
{
  "id": 12,
  "company_id": 2,
  "dispatcher_user_id": 2,
  "load_snapshot_id": 62,
  "load_id": 62,
  "truck_search_session_id": 16,
  "score": 145.5,
  "breakdown": {
    "posted_rate": {
      "points": 52.5,
      "value": 3825,
      "reason": "Rate is at or above minimum."
    },
    "rpm": {
      "points": 70,
      "value": 4.56,
      "reason": "Rate per mile is at or above minimum."
    }
  },
  "load_snapshot": {
    "id": 62,
    "load_id": 62,
    "source": "DAT",
    "broker": "Atlas Brokerage",
    "origin": "Savannah, GA",
    "destination": "Orlando, FL",
    "pickup_date": "2026-05-28T00:00:00",
    "delivery_date": "2026-05-29T00:00:00",
    "posted_rate": 3825,
    "miles": 837,
    "rpm": 4.57,
    "deadhead_miles": 50,
    "weight": 42000,
    "equipment_type": "Dry Van",
    "raw_data": {}
  },
  "created_at": "2026-05-26T21:09:48.497508+04:00",
  "updated_at": "2026-05-26T21:09:48.497511+04:00"
}
```

Behavior:
- Score belongs to truck session + load snapshot.
- Same load can score differently for different trucks or preferences.
- Results are sorted by score descending.
- Frontend defensively sorts descending too.
- Dispatch Workspace shows a ranked table in `features/search/search-results-table.tsx`.
- Rows expand to show score breakdown sections:
  - `posted_rate`
  - `rpm`
  - `mileage`
  - `origin`
  - `destination`
  - `broker`
  - `driver_preferences`

Not implemented yet:
- AI explanations.
- Save/favorite/reject/contacted/book actions.
- Broker communication.

## 9. Load / Live Loads Future Flow

Current intended separation:

Dispatch Workspace:
- Raw/ranked search results.
- Dispatcher reviews scored loads.

Live Loads:
- Saved/contacted/booked/accepted loads only.
- Not every raw search result.

Future load workflow statuses:
- `saved`
- `favorite`
- `rejected`
- `contacted`
- `booked`
- `picked_up`
- `delivered`
- `cancelled`

Phase 5C should add actions:
- reject
- save
- favorite
- contacted
- book

## 10. Data Flow Diagrams

### Auth

```text
register/login
→ access token
→ localStorage
→ GET /auth/me
→ auth store user
→ protected app
```

### Company

```text
login
→ GET /companies
→ activeCompanyId in localStorage
→ active company in company store
→ all company-scoped endpoints use activeCompanyId
```

### Search

```text
select truck
→ truck defaults preview
→ optional overrides
→ POST /searches/start
→ SearchBatch
→ TruckSearchSession
→ filters_snapshot
→ worker
→ LoadSnapshot
→ ScoringResult
→ Dispatch Workspace ranked results
→ later Live Loads after dispatcher action
```

## 11. Common Bugs / Debugging Notes

Issues already hit:

- CORS `OPTIONS 405`: backend must allow browser preflight for frontend origin.
- `422` payload mismatch: frontend request body must exactly match FastAPI schema.
- Missing migration column: model/schema changes need Alembic migration and DB upgrade.
- `node_modules` should not be pushed.
- Wrong truck id: use DB `id` for API route params and search `truck_ids`; use human `truck_id` only for display.
- Old hidden sessions/localStorage stale batch ids: frontend prunes batch ids that return no visible sessions.
- Frontend should not send driver payload to truck endpoint.
- Components should not call `fetch`; use API modules.
- Search start should send overrides only; backend owns filter generation.

## 12. Development Rules Going Forward

- No mock data unless explicitly temporary and clearly marked.
- No direct `fetch` inside TSX.
- Route pages stay small.
- `activeCompanyId` is required for company-scoped requests.
- Use DB id for API route params.
- Use human `truck_id` only for display.
- Backend owns search filter generation.
- Frontend sends overrides only.
- Live Loads is not raw search results.
- Keep `api/`, `types/`, and backend schemas in sync.
- Update this doc after every major phase.

