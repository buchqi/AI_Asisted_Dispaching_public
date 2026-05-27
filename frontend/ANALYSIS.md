# Freight Command Frontend Analysis

This document explains how the current frontend works, where data comes from, how the main workflows are connected, and which parts are temporary mock/local frontend logic that should later be replaced by backend APIs.

## 1. Project Purpose

This application is a frontend-only freight dispatch operating system.

The product is designed for dispatchers who need to:

- monitor incoming freight loads in realtime
- accept or reject loads
- move accepted loads into a Live Loads workflow
- assign loads to drivers
- connect drivers to trucks/trailers
- track load completion
- search across loads, drivers, trucks, brokers, and assignments
- review notifications and activity
- view operational analytics

At the moment, there is no real backend connected. The frontend simulates backend behavior with:

- mock data
- localStorage
- Zustand state
- a mock WebSocket client

The UI and workflows are already shaped like a real backend-powered dispatch system, but the data layer is still temporary.

## 2. Main Folder Structure

The beta-2 version was reorganized so the backend developer can understand the separation between UI components and backend-ready services.

```txt
beta-2/
  app/
  components/
    dispatch/
    layout/
    ui/
  entities/
    load/
  services/
    search/
    storage/
  shared/
    lib/
  store/
  websocket/
```

## 3. Components Folder

The active React UI now lives under `components/`.

### Domain Components

The current beta-2 structure is domain-based. Each major business area has its own component folder:

```txt
components/auth/
components/loads/
components/drivers/
components/trucks/
components/brokers/
components/assignments/
components/search/
components/notifications/
components/analytics/
components/companies/
components/settings/
components/layout/
components/ui/
components/operations/
```

The backend developer should think of the folders like this:

```txt
components/auth -> services/auth -> /api/auth
components/loads -> services/loads -> /api/loads
components/drivers -> services/drivers -> /api/drivers
components/trucks -> services/trucks -> /api/trucks
components/brokers -> services/brokers -> /api/brokers
components/assignments -> services/assignments -> /api/assignments
components/search -> services/search -> /api/search
components/notifications -> services/notifications -> /api/notifications
components/analytics -> services/analytics -> /api/analytics
components/companies -> services/companies -> /api/companies
```

### `components/dispatch/`

This folder is now only the top-level dispatch workspace/router layer.

Important files:

```txt
components/dispatch/dispatch-workspace.tsx
components/dispatch/operational-page.tsx
```

Main responsibilities:

- Dispatch Workspace
- page routing between domain-owned screens

The actual business UI is now under domain folders.

### `components/loads/`

Important files:

```txt
components/loads/load-table.tsx
components/loads/load-filters.tsx
components/loads/intelligence-drawer.tsx
components/loads/live-loads-page.tsx
```

Main responsibilities:

- realtime load table
- load filters
- load accept/reject/reopen UI
- load intelligence drawer
- Live Loads page entry point

### `components/search/`

Important files:

```txt
components/search/search-center-page.tsx
components/search/search-session-tabs.tsx
```

Main responsibilities:

- Search Center page entry point
- search session tabs
- saved live-search workflow UI

### Other Domain Page Entry Points

```txt
components/auth/auth-gate.tsx
components/drivers/drivers-page.tsx
components/trucks/trucks-page.tsx
components/brokers/brokers-page.tsx
components/assignments/assignments-page.tsx
components/notifications/notifications-page.tsx
components/analytics/analytics-page.tsx
components/companies/companies-page.tsx
components/settings/settings-page.tsx
```

These entry files give backend developers a clear folder for each system area.

### `components/operations/`

This folder contains a temporary legacy backing module:

```txt
components/operations/legacy-operational-pages.tsx
```

It preserves the existing large page implementations while the project is being separated into smaller domain files. The routing now goes through domain entry points, so the next refactor can extract each page internals from this legacy module without changing app navigation.

### `components/layout/`

This folder contains persistent application shell components.

Important files:

```txt
components/layout/operations-shell.tsx
components/layout/topbar.tsx
components/layout/sidebar.tsx
components/layout/toast-viewport.tsx
components/layout/notification-detail-modal.tsx
```

Main responsibilities:

- left sidebar navigation
- top global search bar
- topbar counters
- notifications panel
- dispatcher profile panel
- app shell layout
- toast notifications
- notification detail modal

### `components/ui/`

This folder contains small reusable UI primitives.

Important files:

```txt
components/ui/badge.tsx
components/ui/icon-button.tsx
components/ui/panel.tsx
```

These are not backend-related. They are shared visual components used by many screens.

## 4. Services Folder

The `services/` folder is the backend-ready boundary.

The idea is:

```txt
React UI -> hooks/components -> services -> backend API
```

Currently the service layer still reads mock/localStorage data, but this is the correct place to replace temporary frontend data with real backend calls.

### `services/search/search-api.ts`

This is the planned single entry point for global search and Search Center results.

Current behavior:

- reads mock loads
- reads localStorage drivers
- reads localStorage trucks
- reads localStorage assignments
- reads mock broker profiles
- builds normalized search results

Future backend behavior:

This file should call a backend endpoint such as:

```txt
GET /api/search?q=carter&type=All
```

The UI should not need to know whether results came from localStorage or the backend.

### `services/search/types.ts`

This defines the unified search result contract.

Important type:

```ts
type SearchResult = {
  id: string;
  domain: "load" | "driver" | "truck" | "broker" | "assignment" | "action";
  title: string;
  body: string;
  meta: string;
  tone: "green" | "cyan" | "amber" | "red" | "violet" | "slate";
  page: WorkspacePage;
  query: string;
  loadId?: string;
  driverId?: string;
  truckId?: string;
  brokerId?: string;
  assignmentId?: string;
};
```

The backend should return data in this shape for global search.

### `services/storage/persistence.ts`

This temporarily re-exports localStorage helpers.

Current behavior:

- reads JSON from browser localStorage
- writes JSON to browser localStorage

Future backend behavior:

Most localStorage usage should be replaced by real backend endpoints.

## 5. Entity Data

### `entities/load/types.ts`

This file defines the main freight load shape.

Important types:

```ts
FreightLoad
BrokerProfile
LoadDecision
```

`FreightLoad` is the main object used in the Dispatch Workspace and Live Loads.

Important load fields:

```txt
id
pickup
delivery
rpm
miles
deadhead
weight
equipment
broker
company
phone
rate
source
status
dispatcher
aiScore
hot
receivedAt
updatedAt
```

### `entities/load/mock-loads.ts`

This file generates mock freight loads and broker profiles.

Current behavior:

- creates 5 starter loads
- creates mock broker profiles
- creates incoming mock loads
- patches random loads for fake realtime changes

Future backend replacement:

This file should eventually be removed from production data flow.

Backend should provide:

```txt
GET /api/loads
GET /api/brokers
WebSocket load stream
```

## 6. Global State

### `store/workspace-store.ts`

This file uses Zustand for frontend state.

It stores UI state and temporary workflow state.

Important state:

```txt
activePage
selectedLoadId
drawerOpen
globalSearch
laneFilter
equipmentFilter
minRpm
maxDeadhead
minBrokerScore
maxWeight
activeLoadDate
decisionFilter
notifications
focusedLoadId
claimedLoadIds
watchedLoadIds
hiddenLoadIds
calledLoadIds
loadDecisions
```

Important actions:

```txt
setActivePage
selectLoad
setGlobalSearch
setLaneFilter
setEquipmentFilter
setActiveLoadDate
setDecisionFilter
pushNotification
focusLoad
claimLoad
watchLoad
hideLoad
markLoadCalled
acceptLoad
rejectLoad
reopenLoad
```

Important note:

Some data currently stored in Zustand/localStorage should later move to the backend.

For example:

```txt
loadDecisions
claimedLoadIds
watchedLoadIds
hiddenLoadIds
calledLoadIds
notifications
```

These are workflow records and should become backend database records later.

## 7. Dispatch Workspace Flow

Main file:

```txt
components/dispatch/dispatch-workspace.tsx
```

This is the main operational screen.

Current data source:

```txt
mockLoads
localStorage key: freight-command-dispatch-loads
mock WebSocket client
```

Flow:

1. The screen starts with mock loads.
2. After hydration, it loads saved dispatch loads from localStorage.
3. A mock realtime client starts.
4. The mock client emits new loads every 60 seconds.
5. New loads are inserted at the top of the table.
6. Activity Stream receives a new item.
7. Notification system receives a new load notification.
8. The load table is filtered by search/filter state.

Filters applied in Dispatch Workspace:

```txt
globalSearch
laneFilter
equipmentFilter
minRpm
maxDeadhead
minBrokerScore
maxWeight
activeLoadDate
decisionFilter
```

Backend replacement:

The frontend should eventually receive loads from:

```txt
GET /api/loads/live
WebSocket /ws/loads
```

Possible API example:

```txt
GET /api/loads/live?date=2026-05-27&equipment=Dry%20Van&minRpm=2.35&maxDeadhead=100&decision=new
```

Possible WebSocket event:

```ts
{
  type: "new_load",
  load: FreightLoad
}
```

## 8. Load Table Flow

Main file:

```txt
components/loads/load-table.tsx
```

This is the core product table.

Current behavior:

- shows load rows
- supports row selection
- opens the intelligence drawer
- highlights changed realtime rows
- shows status badges
- supports Accept
- supports Reject
- supports Reopen decision

When the dispatcher clicks a row:

```txt
selectLoad(load)
```

This stores `selectedLoadId` in Zustand and opens the intelligence drawer.

When the dispatcher clicks Accept:

```txt
acceptLoad(load)
```

This creates a `LoadDecision` record with:

```txt
status: accepted
load: full load snapshot
decidedAt: timestamp
```

The accepted load then appears in Live Loads.

When the dispatcher clicks Reject:

1. A reject modal opens.
2. Dispatcher selects a reason.
3. Dispatcher can write an optional note.
4. `rejectLoad(load, reason, note)` is called.
5. The row remains in Dispatch Workspace with rejected status.

Backend replacement:

Accept/reject should become backend mutations:

```txt
POST /api/loads/:id/accept
POST /api/loads/:id/reject
POST /api/loads/:id/reopen
```

The backend should store:

```txt
loadId
decisionStatus
reason
note
dispatcherId
decidedAt
```

## 9. Live Loads Flow

Main file:

```txt
components/dispatch/operational-page.tsx
```

Function:

```txt
LiveLoadsPage()
```

Current source:

```txt
loadDecisions from Zustand/localStorage
```

Only accepted loads appear here.

Logic:

```txt
Object.values(loadDecisions)
  .filter(decision => decision.status === "accepted")
  .map(decision => decision.load)
```

Live Loads allows the dispatcher to:

- search accepted loads
- filter by source
- filter by status
- show hot loads only
- select a load
- claim load
- call broker
- watch load
- hide load
- assign driver
- complete load

Backend replacement:

Accepted loads should come from:

```txt
GET /api/loads?decision=accepted
```

or:

```txt
GET /api/live-loads
```

## 10. Driver Assignment Flow

Current file:

```txt
components/dispatch/operational-page.tsx
```

Current data sources:

```txt
localStorage key: freight-command-drivers
localStorage key: freight-command-load-assignments
```

When a dispatcher assigns a driver:

1. The selected accepted load is used.
2. The selected driver is used.
3. A `LoadAssignment` record is created.
4. The assignment status becomes `assigned`.
5. The driver status becomes `driving`.
6. The load is marked as claimed.

Current assignment object:

```ts
type LoadAssignment = {
  id: string;
  loadId: string;
  driverName: string;
  assignedAt: number;
  status: "assigned" | "completed";
  completedAt?: number;
  score?: number;
  dispatcherComment?: string;
  driverComment?: string;
  issueLevel?: "none" | "minor" | "major";
  detentionMinutes?: number;
  proofNumber?: string;
};
```

Backend replacement:

```txt
POST /api/assignments
GET /api/assignments
PATCH /api/assignments/:id
```

Assignment creation payload:

```ts
{
  loadId: string;
  driverId: string;
  truckId?: string;
}
```

## 11. Load Completion Flow

Current file:

```txt
components/dispatch/operational-page.tsx
```

When a dispatcher completes a load:

1. The selected load must already have an assignment.
2. Dispatcher enters score.
3. Dispatcher enters comments.
4. Dispatcher selects issue level.
5. Dispatcher enters detention minutes.
6. Dispatcher enters proof/POD number.
7. Assignment status changes to `completed`.
8. Driver status changes back to `available`.

Backend replacement:

```txt
POST /api/assignments/:id/complete
```

Payload:

```ts
{
  score: number;
  dispatcherComment: string;
  driverComment: string;
  issueLevel: "none" | "minor" | "major";
  detentionMinutes: number;
  proofNumber: string;
}
```

## 12. Search System

There are currently two major search experiences:

1. Global Search in the topbar
2. Search Center page

### Global Search

Main file:

```txt
components/layout/topbar.tsx
```

Current behavior:

- reads query from Zustand `globalSearch`
- builds command-style results
- searches loads, drivers, trucks, brokers, assignments, and actions
- clicking a result navigates to the correct page
- load results focus a specific load

Current sources:

```txt
mockLoads
mockBrokerProfiles
localStorage drivers
localStorage trucks
localStorage assignments
```

Backend-ready target:

This logic should call:

```txt
services/search/search-api.ts
```

Then later `search-api.ts` should call:

```txt
GET /api/search
```

### Search Center

Main file:

```txt
components/dispatch/operational-page.tsx
```

Function:

```txt
SearchSessionsPage()
```

Current behavior:

- searches across loads, drivers, trailers, brokers, assignments
- has category tabs:

```txt
All
Loads
Drivers
Trailers
Brokers
Assignments
```

Current source:

```txt
buildSearchCenterResults()
```

Backend-ready target:

This should also use:

```txt
services/search/search-api.ts
```

Backend endpoint:

```txt
GET /api/search?q=Unit%20318&type=Trailers
```

## 13. Search Result Contract

The backend should return a normalized result shape.

Recommended response:

```ts
{
  results: [
    {
      id: "driver-M. Carter",
      domain: "driver",
      title: "M. Carter",
      body: "(404) 555-0194 / GA-CDL-8841 / Atlanta, GA / Unit 204",
      meta: "available",
      tone: "green",
      page: "drivers",
      query: "M. Carter",
      driverId: "driver_1"
    }
  ]
}
```

This lets the frontend route results without custom frontend guessing.

## 14. Searchable Fields

### Loads

Searchable fields:

```txt
load id
pickup
delivery
broker
company
phone
equipment
source
status
assigned driver
```

### Drivers

Searchable fields:

```txt
driver name
phone
email
license/CDL
location
home terminal
status
truck/unit id
active load id
```

### Trucks / Trailers

Searchable fields:

```txt
unit id
equipment
location
status
driver
tracker city
tracker state
tracker note
moving
stopped
loaded
service
in transit
```

### Brokers

Searchable fields:

```txt
broker name
company
phone
email
score
```

### Assignments

Searchable fields:

```txt
assignment id
load id
driver name
assignment status
pickup
delivery
broker
```

## 15. Search Sessions

Search Sessions are saved live-search rules.

Current file:

```txt
components/dispatch/operational-page.tsx
```

Current data source:

```txt
localStorage key: freight-command-search-sessions
```

A search session contains:

```txt
name
origin
destination
equipment
minRpm
status
createdAt
```

Current behavior:

- create session
- pause/resume session
- delete session
- preview matching mock loads

Future backend behavior:

Search sessions should become backend records.

Recommended endpoints:

```txt
GET /api/search-sessions
POST /api/search-sessions
PATCH /api/search-sessions/:id
DELETE /api/search-sessions/:id
```

The backend worker should use these search sessions to decide which incoming loads match each dispatcher rule.

Possible WebSocket event:

```ts
{
  type: "search_session_match",
  sessionId: "S-101",
  load: FreightLoad
}
```

## 16. Notifications

Current source:

```txt
Zustand notifications array
```

Current behavior:

- only new-load notifications are shown
- notifications appear globally no matter which page is open
- unread count appears on the bell icon
- clicking notification opens a centered modal
- reading notification decreases unread count

Backend replacement:

Notifications should be persisted by backend.

Recommended endpoints:

```txt
GET /api/notifications
PATCH /api/notifications/:id/read
PATCH /api/notifications/read-all
```

Realtime event:

```ts
{
  type: "notification",
  notification: {
    id: string;
    title: string;
    body: string;
    source: "live-loads";
    loadId?: string;
  }
}
```

## 17. Trucks and Drivers

Current source:

```txt
localStorage key: freight-command-drivers
localStorage key: freight-command-trucks
```

Current driver features:

- add driver
- delete driver
- search driver
- show driver analytics
- show active assignment
- show truck/unit

Current truck features:

- add trailer/unit
- delete trailer/unit
- assign driver to trailer
- unassign driver from trailer
- update tracker state
- update tracker city/state/note

Backend replacement:

Recommended endpoints:

```txt
GET /api/drivers
POST /api/drivers
PATCH /api/drivers/:id
DELETE /api/drivers/:id

GET /api/trucks
POST /api/trucks
PATCH /api/trucks/:id
DELETE /api/trucks/:id

POST /api/trucks/:id/assign-driver
POST /api/trucks/:id/unassign-driver
PATCH /api/trucks/:id/tracker
```

## 18. Broker Intelligence

Current source:

```txt
mockBrokerProfiles
```

Current behavior:

- broker profile appears in Intelligence Drawer
- broker phone is shown
- company info is shown
- broker score is shown
- lane history is shown
- notes and previous interactions are shown

Backend replacement:

Recommended endpoints:

```txt
GET /api/brokers
GET /api/brokers/:id
GET /api/brokers/:id/interactions
POST /api/brokers/:id/notes
```

## 19. Daily Archive / Date Filtering

Current source:

```txt
FreightLoad.receivedAt
Zustand activeLoadDate
localStorage dispatch loads
```

Current behavior:

- each load has `receivedAt`
- Dispatch Workspace has a date filter
- only loads from selected day are visible
- at midnight, the active day moves forward if the dispatcher was viewing the current day
- older loads remain in localStorage for review

Backend replacement:

Recommended endpoint:

```txt
GET /api/loads?date=2026-05-27
```

The backend should store load timestamps and support date filtering.

## 20. Mock WebSocket

Current file:

```txt
websocket/realtime-client.ts
```

Current behavior:

- emits status events
- emits a new load every 60 seconds
- emits patch updates every 14 seconds
- emits new-load notifications

Current event types:

```txt
status
new-load
patch
notification
```

Backend replacement:

Use a real WebSocket endpoint:

```txt
ws://backend/ws/loads
```

Recommended events:

```ts
{ type: "status", status: "live" }
{ type: "new_load", load: FreightLoad }
{ type: "load_patch", loadId: string, patch: Partial<FreightLoad> }
{ type: "notification", notification: AppNotification }
{ type: "search_session_match", sessionId: string, load: FreightLoad }
```

## 21. Current Temporary Storage Keys

The frontend currently uses these browser localStorage keys:

```txt
freight-command-auth-users
freight-command-auth-session
freight-command-dispatch-loads
freight-command-load-decisions
freight-command-claimed-loads
freight-command-watched-loads
freight-command-hidden-loads
freight-command-called-loads
freight-command-drivers
freight-command-trucks
freight-command-load-assignments
freight-command-search-sessions
freight-command-broker-workflow
freight-command-companies
freight-command-layout
```

These are temporary frontend storage keys.

Most of them should become backend tables or backend-owned records.

## 22. Recommended Backend Tables

Recommended database/domain tables:

```txt
users
dispatchers
loads
load_decisions
load_events
brokers
broker_notes
broker_interactions
drivers
trucks
truck_driver_links
truck_tracker_updates
assignments
assignment_completions
search_sessions
notifications
companies
```

## 23. Recommended Backend API Summary

### Auth

```txt
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
GET /api/auth/me
```

### Loads

```txt
GET /api/loads
GET /api/loads/live
GET /api/loads/:id
POST /api/loads/:id/accept
POST /api/loads/:id/reject
POST /api/loads/:id/reopen
```

### Assignments

```txt
GET /api/assignments
POST /api/assignments
PATCH /api/assignments/:id
POST /api/assignments/:id/complete
```

### Drivers

```txt
GET /api/drivers
POST /api/drivers
PATCH /api/drivers/:id
DELETE /api/drivers/:id
```

### Trucks

```txt
GET /api/trucks
POST /api/trucks
PATCH /api/trucks/:id
DELETE /api/trucks/:id
POST /api/trucks/:id/assign-driver
POST /api/trucks/:id/unassign-driver
PATCH /api/trucks/:id/tracker
```

### Brokers

```txt
GET /api/brokers
GET /api/brokers/:id
POST /api/brokers/:id/notes
```

### Search

```txt
GET /api/search
GET /api/search-sessions
POST /api/search-sessions
PATCH /api/search-sessions/:id
DELETE /api/search-sessions/:id
```

### Notifications

```txt
GET /api/notifications
PATCH /api/notifications/:id/read
PATCH /api/notifications/read-all
```

### WebSocket

```txt
GET /ws/loads
```

## 24. What Backend Should Replace First

Recommended order:

1. Auth session
2. Loads API
3. Real WebSocket load stream
4. Load decisions API
5. Live Loads API
6. Drivers API
7. Trucks API
8. Assignments API
9. Search API
10. Notifications API
11. Analytics API

This order is safest because the Dispatch Workspace and Live Loads are the core product workflow.

## 25. Important Backend Integration Rule

Do not put backend calls directly inside many UI components.

Preferred structure:

```txt
components -> services -> backend
```

Example:

```txt
components/layout/topbar.tsx
  calls searchApi.search()

services/search/search-api.ts
  calls GET /api/search
```

This keeps the UI stable and makes backend replacement easier.

## 26. Current System Summary

Current frontend behavior:

```txt
mock data + localStorage + Zustand + mock WebSocket
```

Target production behavior:

```txt
backend database + REST API + WebSocket + frontend services
```

The UI is already built around the correct operational workflows.

The main backend task is not to rebuild the UI. The main backend task is to replace temporary frontend data sources with real APIs while keeping the same contracts and workflows.
