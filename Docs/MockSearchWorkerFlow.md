# Phase 9 — Mock Search Worker Flow

## Goal

Phase 9 creates the first working search execution flow without using real load-board automation.

Before this phase, the system could create search records, but nothing actually “ran”.

After this phase, when a dispatcher starts a search, the backend creates search sessions, runs mock workers, generates fake load data, stores worker logs, and updates statuses from `pending` to `running` to `completed`.

---

# Why Phase 9 Exists

Real load-board automation is hard because it requires:

- browser automation
- login/session handling
- cookies
- scraping HTML
- anti-bot handling
- timeouts
- retries
- different logic for every website

If we start with real automation too early, the project can get blocked.

Phase 9 avoids that by proving the search architecture first.

The goal is not to get real loads yet.

The goal is to prove this flow:

```text
Dispatcher clicks Search
        ↓
SearchBatch is created
        ↓
TruckSearchSessions are created
        ↓
Workers start
        ↓
Progress/logs are stored
        ↓
Mock loads are generated
        ↓
Search statuses are updated
        ↓
Search completes
```

---

# What Changed in Phase 9

## Before Phase 9

In Phase 8, this endpoint existed:

```http
POST /searches/start
```

But it only created database records:

```text
SearchBatch
TruckSearchSessions
```

The status stayed mostly:

```text
pending
```

No worker actually ran.

No progress was simulated.

No logs were created by a worker.

No search lifecycle was tested.

---

## After Phase 9

The same endpoint is still used:

```http
POST /searches/start
```

But now it does more internally:

```text
POST /searches/start
        ↓
Create SearchBatch
        ↓
Create TruckSearchSessions
        ↓
Start WorkerManager
        ↓
Run MockSearchWorker for each TruckSearchSession
        ↓
Create WorkerLogs
        ↓
Generate mock load data
        ↓
Mark TruckSearchSessions completed
        ↓
Mark SearchBatch completed
```

No new endpoint was needed.

The endpoint stayed the same.

The backend behavior behind the endpoint became stronger.

---

# Main Components Added

## 1. MockSearchWorker

Recommended file:

```text
app/workers/mock_search_worker.py
```

The `MockSearchWorker` simulates what a real load-board worker will later do.

It pretends to:

- start a search
- connect to load boards
- find loads
- store/log results
- complete the search

Current mock behavior:

```text
Start TruckSearchSession
        ↓
Create worker.started log
        ↓
Simulate load-board connection
        ↓
Create load_board.connected log
        ↓
Generate fake loads
        ↓
Create loads.found log
        ↓
Mark TruckSearchSession completed
        ↓
Create worker.completed log
```

It does not open any real website.

It does not use Playwright or Selenium.

It does not scrape real data.

It only simulates the future flow.

---

## 2. WorkerManager

Recommended file:

```text
app/workers/worker_manager.py
```

The `WorkerManager` controls which workers should run.

Current simple flow:

```text
SearchBatch
        ↓
WorkerManager
        ↓
MockSearchWorker for TruckSearchSession #1
MockSearchWorker for TruckSearchSession #2
MockSearchWorker for TruckSearchSession #3
```

For MVP, it can run workers synchronously or in a simple loop.

Later, it can be upgraded to use:

- background tasks
- async execution
- Celery
- Redis Queue
- parallel workers
- distributed workers

The important thing is that the API does not need to change.

---

## 3. WorkerLog

Worker logs were introduced in Phase 8, but Phase 9 starts using them properly.

Worker logs show what happened during the search.

Example logs:

```text
worker.started
load_board.connected
loads.found
worker.completed
```

Example future logs:

```text
dat.login.started
dat.login.success
dat.search.filters.applied
dat.loads.extracted
truckstop.timeout
worker.failed
```

Worker logs are important because later real browser automation will fail often.

Without logs, debugging would be painful.

---

# Status Flow

## Before Phase 9

Search statuses were mostly static:

```text
pending
```

## After Phase 9

Truck search sessions now follow a real lifecycle:

```text
pending
    ↓
running
    ↓
completed
```

If something fails:

```text
pending
    ↓
running
    ↓
failed
```

Search batch status also changes:

```text
pending
    ↓
running
    ↓
completed
```

or:

```text
pending
    ↓
running
    ↓
failed
```

---

# Current Search Flow

## Dispatcher Action

The dispatcher starts search from frontend:

```http
POST /searches/start
```

Example request:

```json
{
  "company_id": 2,
  "truck_ids": [1, 2, 3],
  "filters": {
    "origin_state": "GA",
    "destination_states": ["TX", "FL"],
    "equipment_type": "REEFER",
    "min_rate": 1500,
    "max_weight": 42000
  },
  "timeout_seconds": 120
}
```

---

## Backend Flow

```text
1. API receives request
2. API checks user is active member of company
3. SearchService creates SearchBatch
4. SearchService creates TruckSearchSessions
5. WorkerManager starts workers
6. MockSearchWorker runs for each TruckSearchSession
7. Worker logs are created
8. Mock loads are generated
9. TruckSearchSessions are marked completed
10. SearchBatch is marked completed
11. Response is returned
```

---

# Relationship With Earlier Phases

## Phase 7

Phase 7 created:

```text
LoadBoardSession
```

This answers:

```text
Which load boards does this company use?
```

Example:

```text
Company 2 has:
- DAT
- TruckStop
- 123Loadboard
```

---

## Phase 8

Phase 8 created:

```text
SearchBatch
TruckSearchSession
WorkerLog
```

This answers:

```text
What search did dispatcher start?
Which trucks are included?
What is each truck search status?
What logs were created?
```

---

## Phase 9

Phase 9 connects the execution flow:

```text
SearchBatch
        ↓
TruckSearchSession
        ↓
WorkerManager
        ↓
MockSearchWorker
        ↓
WorkerLog
        ↓
completed status
```

This proves that searches can actually run through the backend lifecycle.

---

# Why No New Endpoint Was Needed

Phase 9 did not add a new endpoint because the external user action did not change.

The dispatcher still only needs to click:

```text
Search
```

So the same endpoint remains correct:

```http
POST /searches/start
```

The difference is internal.

In Phase 8:

```text
POST /searches/start
        ↓
only creates records
```

In Phase 9:

```text
POST /searches/start
        ↓
creates records
        ↓
runs mock workers
        ↓
updates statuses
        ↓
stores logs
```

This is good API design because frontend does not need to know whether the backend uses:

- mock worker
- real DAT worker
- real TruckStop worker
- background worker
- browser automation

The API stays stable.

---

# Current Architecture

```text
POST /searches/start
        ↓
SearchService
        ↓
Create SearchBatch
        ↓
Create TruckSearchSessions
        ↓
WorkerManager
        ↓
MockSearchWorker
        ↓
WorkerLogs
        ↓
Status updates
```

---

# Future Real Search Architecture

Later, the same structure should remain.

Only the worker implementation changes.

Current:

```text
WorkerManager
        ↓
MockSearchWorker
```

Future:

```text
WorkerManager
        ↓
DATSearchWorker
TruckStopSearchWorker
LoadBoardSearchWorker
```

or:

```text
WorkerManager
        ↓
RealSearchWorker
        ↓
Board-specific provider
```

The API should remain:

```http
POST /searches/start
```

The search service should mostly remain the same.

The database status/log flow should remain the same.

---

# What Changes When Real Search Is Added

## Current Mock Worker

Today, the mock worker does this:

```text
Generate fake loads
Pretend load boards responded
Create logs
Mark search completed
```

---

## Future Real Worker

Later, the real worker will do this:

```text
Load company LoadBoardSessions
        ↓
Find active load-board sessions
        ↓
Open real browser context
        ↓
Use saved login/session information
        ↓
Navigate to load-board website
        ↓
Apply search filters
        ↓
Extract load data
        ↓
Store raw results
        ↓
Normalize results
        ↓
Deduplicate loads
        ↓
Score loads
        ↓
Store final results
        ↓
Create logs
        ↓
Mark session completed
```

---

# What Should Stay the Same in Real Search

These parts should not need major changes:

```text
POST /searches/start endpoint
SearchBatch model
TruckSearchSession model
WorkerLog model
SearchService start flow
WorkerManager role
Status lifecycle
Permission checks
Company/truck validation
```

The reason is simple:

The dispatcher action stays the same.

Only the implementation behind the worker changes.

---

# What Should Be Replaced Later

This part will eventually be replaced:

```text
MockSearchWorker
```

with something like:

```text
RealSearchWorker
DATSearchWorker
TruckStopSearchWorker
123LoadboardSearchWorker
```

or a provider-based architecture:

```text
SearchWorker
        ↓
DATProvider
TruckStopProvider
123LoadboardProvider
```

---

# Recommended Future Worker Design

A good future structure:

```text
WorkerManager
        ↓
SearchWorker
        ↓
LoadBoardProvider interface
        ↓
DATProvider
TruckStopProvider
123LoadboardProvider
```

Where:

```text
WorkerManager
```

decides which sessions should run.

```text
SearchWorker
```

handles one truck search session.

```text
LoadBoardProvider
```

handles one specific website.

Example:

```text
TruckSearchSession #21
        ↓
SearchWorker
        ↓
DATProvider
TruckStopProvider
123LoadboardProvider
```

Each provider returns raw loads.

Then the system continues:

```text
raw loads
        ↓
normalization
        ↓
deduplication
        ↓
scoring
        ↓
results
```

---

# Real Search Worker Responsibilities

A real search worker should be responsible for:

- loading TruckSearchSession
- marking session as running
- loading company LoadBoardSessions
- selecting active load boards
- starting board-specific search providers
- collecting raw load data
- saving raw results
- creating WorkerLogs
- handling errors
- handling timeouts
- marking session completed or failed

---

# Real Load Board Provider Responsibilities

Each board-specific provider should be responsible for:

- opening the website
- using correct login/session
- applying filters
- handling website layout
- extracting load cards/rows
- returning raw load dictionaries
- reporting provider-specific errors

Example providers:

```text
DATProvider
TruckStopProvider
123LoadboardProvider
```

They should not control the whole search batch.

They should only know how to search one website.

---

# Future Flow With Real Providers

```text
POST /searches/start
        ↓
SearchService creates SearchBatch
        ↓
SearchService creates TruckSearchSessions
        ↓
WorkerManager starts SearchWorker
        ↓
SearchWorker loads active LoadBoardSessions
        ↓
SearchWorker calls providers
        ↓
DATProvider searches DAT
        ↓
TruckStopProvider searches TruckStop
        ↓
123LoadboardProvider searches 123Loadboard
        ↓
Raw results returned
        ↓
Normalize
        ↓
Deduplicate
        ↓
Score
        ↓
Store final results
        ↓
Mark completed
```

---

# Why This Architecture Is Good

This architecture is good because it separates responsibilities.

## API Layer

Handles HTTP requests and authentication.

```text
Who is calling?
Is user allowed?
What request did they send?
```

## SearchService

Creates search records and coordinates search startup.

```text
Create batch
Create truck sessions
Start workers
```

## WorkerManager

Controls worker execution.

```text
Which workers should run?
How many?
Sequential or parallel?
```

## Worker

Executes one truck search.

```text
Run search
Collect results
Update status
Create logs
```

## Provider

Handles one load-board website.

```text
Search DAT
Search TruckStop
Search 123Loadboard
```

---

# Current Phase 9 Limitations

Phase 9 still does not include:

- real load-board login
- real browser automation
- Playwright/Selenium
- real scraping
- raw load result storage architecture
- normalization
- deduplication
- scoring
- WebSocket streaming
- booking flow

Those come later.

---

# What Phase 9 Proves

Phase 9 proves:

```text
Search endpoint works
SearchBatch is created
TruckSearchSessions are created
Workers can run
WorkerLogs are stored
Statuses update correctly
Search can complete
```

This means the backend search foundation is alive.

---

# Done Criteria

Phase 9 is done when:

```text
POST /searches/start creates a real SearchBatch
TruckSearchSessions are created
Mock workers run
Worker logs are stored
TruckSearchSession status changes pending → running → completed
SearchBatch status changes pending → running → completed
No real browser automation is required
```

---

# Example Manual Test

## Request

```http
POST /searches/start
```

```json
{
  "company_id": 2,
  "truck_ids": [1],
  "filters": {
    "origin_state": "GA",
    "equipment_type": "REEFER"
  },
  "timeout_seconds": 120
}
```

## Expected Result

```text
SearchBatch created
TruckSearchSession created
MockSearchWorker runs
WorkerLogs created
TruckSearchSession completed
SearchBatch completed
```

---

# Example Worker Logs

```text
worker.started
load_board.connected
loads.found
worker.completed
```

These logs show that the mock search flow executed successfully.

---

# Summary

Phase 9 turns search from passive database records into an executable backend workflow.

Before Phase 9:

```text
Search records existed, but nothing ran.
```

After Phase 9:

```text
Search records are created, mock workers run, logs are stored, and statuses complete.
```

Later, real search should not require rewriting the whole system.

The main future change is replacing:

```text
MockSearchWorker
```

with:

```text
RealSearchWorker / DATProvider / TruckStopProvider / 123LoadboardProvider
```

while keeping the same endpoint, search service, worker manager, statuses, and logs.
