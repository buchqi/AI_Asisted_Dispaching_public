# AI-Assisted Dispatching MVP — System Architecture

## 1. MVP Goal

The goal of this MVP is to help dispatch companies search loads for their trucks across multiple load boards, rank the results, explain the best matches with AI, and allow dispatchers to save, reject, contact, or book loads.

The system is designed for medium-sized dispatch companies where multiple dispatchers can work under the same company account and share visibility over trucks, drivers, searches, and booked-load history.

---

## 2. High-Level System Architecture

```txt
Frontend Dispatcher Dashboard
        |
        v
FastAPI Backend
        |
        |-- Auth Module
        |-- Company & User Module
        |-- Truck Module
        |-- Driver Module
        |-- Load Board Session Module
        |-- Search Engine Module
        |-- Load Results Module
        |-- Dispatcher Action Module
        |-- Booking Module
        |-- Scoring & AI Module
        |-- WebSocket Progress Module
        |
        v
Database
```

---

## 3. Main System Components

### 3.1 Frontend Dispatcher Dashboard

The frontend dashboard is the main interface used by dispatchers and company admins.

Main responsibilities:

```txt
User login
Company selection
Truck management
Driver management
Starting load searches
Watching live search progress
Reviewing ranked loads
Saving/rejecting/favoriting/contacting loads
Booking loads
Viewing booked-load history
```

Frontend communication methods:

```txt
REST API for standard operations
WebSocket connection for live updates
```

The frontend should eventually provide:

```txt
Dashboard
Truck management page
Driver management page
Live search page
Load results page
Booked loads page
Search history page
Company settings page
```

---

### 3.2 FastAPI Backend

The FastAPI backend acts as the central application layer.

Main responsibilities:

```txt
Authentication
Authorization
Company management
Truck management
Driver management
Load-board session management
Search orchestration
Worker coordination
Load deduplication
Scoring logic
AI explanation generation
Dispatcher action handling
Booked load management
Real-time progress streaming
```

The backend should be organized into separated modules/routers.

Suggested backend structure:

```txt
auth
companies
memberships
trucks
drivers
load_boards
searches
loads
dispatcher_actions
bookings
scoring
websockets
workers
```

---

## 4. Frontend → Backend Flow

### 4.1 Dispatcher Workflow

```txt
Dispatcher logs in
        |
        v
Selects company
        |
        v
Views company trucks
        |
        v
Selects truck(s)
        |
        v
Starts load search
        |
        v
Backend creates SearchBatch
        |
        v
Backend creates TruckSearchSessions
        |
        v
Workers search multiple load boards
        |
        v
Loads are parsed and deduplicated
        |
        v
Rule-based scoring runs
        |
        v
Top loads receive AI explanations
        |
        v
Frontend receives live updates
        |
        v
Dispatcher reviews ranked loads
        |
        v
Dispatcher saves/rejects/contacts/books load
```

---

## 5. Search Engine Architecture

The Search Engine is the core workflow system of the MVP.

The search engine is responsible for:

```txt
Creating searches
Launching workers
Managing browser contexts
Using company load-board sessions
Collecting loads
Deduplicating results
Triggering scoring
Triggering AI explanations
Streaming progress updates
Saving search history
```

---

### 5.1 Search Hierarchy

```txt
SearchBatch
        |
        |-- TruckSearchSession
        |-- TruckSearchSession
        |-- TruckSearchSession
```

Explanation:

```txt
One dispatcher action creates one SearchBatch.
Each selected truck receives its own TruckSearchSession.
Each TruckSearchSession runs independently.
```

Example:

```txt
Dispatcher selects:
Truck 101
Truck 202
Truck 305

System creates:
1 SearchBatch
3 TruckSearchSessions
3 Worker processes/tasks
```

---

### 5.2 Worker Architecture

Worker responsibilities:

```txt
Search assigned load boards
Use browser automation
Apply search filters
Collect raw loads
Parse results
Store snapshots
Handle failures
Send live progress updates
```

Worker model:

```txt
One worker per TruckSearchSession
Separate browser context per load board
Searches run concurrently
Searches have timeout protection
```

---

### 5.3 Search Execution Flow

```txt
POST /searches/start
        |
        v
Create SearchBatch
        |
        v
Create TruckSearchSessions
        |
        v
Start workers
        |
        v
Workers open browser contexts
        |
        v
Workers use company-level sessions
        |
        v
Workers search DAT / Truckstop / others
        |
        v
Loads are collected
        |
        v
Loads are parsed
        |
        v
Loads are deduplicated
        |
        v
LoadSnapshots are stored
        |
        v
Rule-based scoring runs
        |
        v
Top loads get AI explanations
        |
        v
Frontend receives final ranked results
```

---

## 6. Load Board Session Architecture

Load-board sessions belong to the company, not to individual dispatchers.

Purpose:

```txt
Allow workers to use real authenticated sessions
Avoid forcing users to install local software
Support centralized browser automation
```

Supported load boards in future:

```txt
DAT
Truckstop
123Loadboard
Other future integrations
```

---

### 6.1 Session Flow

```txt
Dispatcher logs into DAT
        |
        v
System stores company session
        |
        v
Workers reuse saved session
        |
        v
Session health monitored
        |
        v
Expired sessions require relogin
```

Stored session information:

```txt
Session status
Session health
Expiration
Last successful usage
Debug information
```

---

## 7. Load Result Architecture

The system separates stable load identity from search-time data.

Reason:

```txt
The same load can appear many times.
The same load can exist on multiple boards.
Rates and details can change.
Search history should be preserved.
```

---

### 7.1 Load Structure

```txt
Load
        |
        |-- LoadSnapshot
        |-- LoadSnapshot
        |
        |-- LoadSource
        |-- LoadSource
```

---

### 7.2 Load

Represents stable load identity.

Stores:

```txt
Broker
Equipment type
Origin
Destination
Deduplication key
```

---

### 7.3 LoadSnapshot

Represents search-time state.

Stores:

```txt
Posted rate
Mileage
Weight
Pickup date
Delivery date
Raw details
```

Purpose:

```txt
Preserve what dispatcher saw during search
Track changing load information
Store search-specific values
```

---

### 7.4 LoadSource

Represents where the load was found.

Examples:

```txt
DAT
Truckstop
Other load boards
```

Purpose:

```txt
Track load origin
Support debugging
Support multi-board deduplication
```

---

### 7.5 Deduplication Strategy

The system should merge duplicate loads.

Initial deduplication key:

```txt
broker + equipment + rate + weight
```

Rule:

```txt
Same load found on multiple boards becomes one Load.
Multiple LoadSources are still preserved.
```

---

## 8. Scoring & AI Architecture

The MVP should use a hybrid ranking approach.

```txt
Rule-based scoring first
AI explanations second
```

Reason:

```txt
Rule-based scoring is easier to debug
Faster than full AI ranking
Cheaper operationally
More transparent for dispatchers
```

---

### 8.1 Scoring Flow

```txt
LoadSnapshot
        |
        v
Rule-Based Scoring
        |
        v
ScoringResult
        |
        v
Top Ranked Loads
        |
        v
AI Explanation Generation
```

---

### 8.2 Scoring Preferences

Scoring preferences are dispatcher-specific.

Reason:

```txt
Different dispatchers care about different things.
Different drivers prefer different lanes/rates.
Dispatcher-driver relationships are personal.
```

Possible scoring factors:

```txt
Rate
Mileage
RPM
Broker
Pickup region
Destination region
Equipment preference
Driver preference
```

---

### 8.3 AI Explanation Generation

AI explanations should only run for top-ranked loads.

Rule:

```txt
Generate explanations only for top 5–10 loads.
```

Purpose:

```txt
Reduce AI cost
Reduce latency
Improve dispatcher understanding
Provide transparent reasoning
```

Example explanation:

```txt
Good RPM
Preferred destination
Matches driver lane history
Strong broker
Low deadhead
```

---

## 9. WebSocket Architecture

WebSockets are used for live progress updates.

REST handles actions.
WebSockets handle streaming updates.

---

### 9.1 WebSocket Flow

```txt
Frontend starts search
        |
        v
Backend launches workers
        |
        v
Workers emit progress events
        |
        v
WebSocket manager broadcasts updates
        |
        v
Frontend updates UI live
```

---

### 9.2 Example Events

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

Purpose:

```txt
No page refreshing
Live dispatcher feedback
Company-wide visibility
Better UX during long searches
```

---

## 10. Dispatcher Ownership Rules

Important MVP business rule:

```txt
Only the dispatcher who started a TruckSearchSession can manipulate its results.
Other dispatchers may observe but not modify.
```

Allowed owner actions:

```txt
Save load
Reject load
Favorite load
Mark contacted
Book load
```

Purpose:

```txt
Prevent dispatcher conflicts
Prevent duplicate work
Keep ownership clear
Avoid booking confusion
```

---

## 11. Booked Load Architecture

Booked loads should be stored historically.

Stored information:

```txt
Dispatcher
Driver
Truck
Posted rate
Final negotiated rate
Mileage
Pickup date
Delivery date
Operational status
```

Statuses:

```txt
booked
picked_up
delivered
cancelled
```

Purpose:

```txt
Operational tracking
Historical analytics
Performance metrics
Future AI training data
```

---

## 12. Real-Time System Visibility

Company-wide visibility rules:

```txt
Dispatchers can see trucks
Dispatchers can see drivers
Dispatchers can see search progress
Dispatchers can see booked loads
Dispatchers can observe active searches
```

Restricted actions:

```txt
Only owner dispatcher manipulates active TruckSearchSession
```

---

## 13. Recommended MVP Build Order

```txt
1. FastAPI project setup
2. Database models
3. Authentication
4. Company & memberships
5. Trucks & drivers
6. SearchBatch & TruckSearchSession
7. Mock search workers
8. WebSocket progress
9. Load result storage
10. Dispatcher actions
11. Booked loads
12. Rule-based scoring
13. AI explanations
14. Real browser automation
```

---

## 14. Initial MVP Technical Notes

Recommended stack:

```txt
Backend:
- FastAPI
- SQLAlchemy
- PostgreSQL
- Alembic

Workers:
- Async tasks initially
- Celery/RQ later if needed

Browser Automation:
- Playwright

Frontend:
- React
- TailwindCSS

Real-Time:
- WebSockets

AI:
- OpenAI API
```

Important recommendation:

```txt
Build with mock load data first.
Do not start with real browser automation.
```
