# Phase 7–8 API Endpoint Documentation

## Purpose

This document explains the API endpoints added in:

- Phase 7 — Load Board Session Records
- Phase 8 — Search Models

These phases do not perform real load-board browser automation yet.

They create the database and API foundation needed for future search workers.

---

# Phase 7 — Load Board Session Records

## Goal

Phase 7 stores company-level load-board connection/session records.

A load board is a website/platform where dispatchers search for freight loads, for example:

- DAT
- TruckStop
- 123Loadboard

For MVP, these records only store metadata such as:

- board name
- account identifier
- status
- health status
- debug notes

Real browser cookies, real login, and automation will be added later.

---

## Why This Phase Exists

Before workers can search load boards, the system must know:

- Which load boards a company uses
- Which accounts belong to the company
- Whether a board connection is active
- Whether a session is healthy or expired

Phase 7 creates that foundation.

Example:

```text
Company A

DAT account
TruckStop account
123Loadboard account
```

Later, search workers will use these records to determine:

```text
Which boards should be searched?
Which board sessions are active?
Which integrations are available?
```

---

## LoadBoardSession Concept

A LoadBoardSession is a company-level configuration record.

Example:

```text
LoadBoardSession #1

Board: DAT
Username: dispatch@company.com
Status: active
Health: healthy
```

This is NOT a running worker.

This is NOT a browser process.

This is simply a stored record representing a load-board connection available to the company.

---

## POST `/companies/{company_id}/load-boards`

### Purpose

Create a load-board session record.

### Used When

A company wants to register a load-board account.

Example:

> This company uses DAT.

### Request

```json
{
  "board_name": "DAT",
  "session_label": "Main DAT Account",
  "username_or_email": "dispatch@example.com"
}
```

### Internal Flow

```text
User sends request
        ↓
Membership check
        ↓
Create LoadBoardSession
        ↓
Store in database
        ↓
Return session
```

### Initial Values

```text
status = pending
health_status = unknown
```

### Response Meaning

The returned object represents one company load-board connection.

---

## GET `/companies/{company_id}/load-boards`

### Purpose

List all load-board session records for a company.

### Used When

Frontend displays company integrations/settings page.

Example UI:

```text
Load Boards

DAT          active
TruckStop    active
123Loadboard expired
```

### Internal Flow

```text
Membership check
        ↓
Query company sessions
        ↓
Return list
```

---

## GET `/companies/{company_id}/load-boards/{session_id}`

### Purpose

Retrieve a single load-board session.

### Used When

Frontend opens details page for one load-board connection.

Example:

```text
Board: DAT
Status: active
Health: healthy
Last Check: 2026-05-21
```

### Internal Flow

```text
Membership check
        ↓
Load session
        ↓
Verify company ownership
        ↓
Return session
```

### Failure Cases

```text
404 Not Found
```

If:

- session does not exist
- session belongs to another company

---

## PATCH `/companies/{company_id}/load-boards/{session_id}`

### Purpose

Update load-board session information.

### Used When

Company updates metadata.

Examples:

- rename account
- update status
- add debug notes
- set expiration

### Example Request

```json
{
  "status": "active",
  "debug_notes": "Manual setup completed"
}
```

### Internal Flow

```text
Membership check
        ↓
Load session
        ↓
Verify company ownership
        ↓
Update provided fields
        ↓
Save changes
```

---

## POST `/companies/{company_id}/load-boards/{session_id}/check-health`

### Purpose

Store health-check result.

### Used When

System or admin verifies board status.

### Example Request

```json
{
  "health_status": "healthy",
  "health_message": "Manual health check passed",
  "debug_notes": "Everything looks good"
}
```

### Internal Flow

```text
Membership check
        ↓
Load session
        ↓
Verify company ownership
        ↓
Update health fields
        ↓
Save changes
```

### Current MVP Rules

```text
healthy   → active
warning   → active
unhealthy → error
```

### Future Purpose

Later this endpoint can be connected to:

- browser automation
- login validation
- cookie/session verification

---

# Phase 8 — Search Models

## Goal

Create the database foundation for search execution.

This phase still does NOT perform real searching.

Instead, it creates:

- SearchBatch
- TruckSearchSession
- WorkerLog

These models will later be used by real search workers.

---

## Why This Phase Exists

When a dispatcher searches for loads, the system needs to track:

- who started the search
- which company started it
- which trucks are included
- search status
- worker activity
- logs
- failures
- cancellations

Phase 8 creates those records.

---

# Core Search Architecture

## SearchBatch

Represents one dispatcher search operation.

Example:

```text
Dispatcher clicks Search
```

System creates:

```text
SearchBatch #10
```

A batch groups all truck searches belonging to one action.

---

## TruckSearchSession

Represents one truck inside a search batch.

Example:

```text
SearchBatch #10

Truck A
Truck B
Truck C
```

Creates:

```text
TruckSearchSession #21
TruckSearchSession #22
TruckSearchSession #23
```

Each truck receives its own session.

Later each session can run independently.

---

## WorkerLog

Stores activity records.

Example:

```text
Started DAT search
Mock provider returned 20 loads
TruckStop timeout
Search canceled manually
```

Worker logs are primarily used for:

- debugging
- auditing
- monitoring
- troubleshooting

---

# Search Status Lifecycle

Possible statuses:

```text
pending
running
completed
failed
canceled
timeout
```

Meaning:

### pending

Search exists but has not started.

### running

Worker is actively processing search.

### completed

Search finished successfully.

### failed

Unexpected error occurred.

### canceled

Dispatcher manually stopped search.

### timeout

Search exceeded allowed execution time.

---

## POST `/searches/start`

### Purpose

Start a new search batch.

### Used When

Dispatcher selects trucks and clicks:

```text
Search Loads
```

### Example Request

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

### Internal Flow

```text
Membership check
        ↓
Validate trucks
        ↓
Verify trucks belong to company
        ↓
Create SearchBatch
        ↓
Create TruckSearchSession for each truck
        ↓
Store filters snapshot
        ↓
Return SearchBatch
```

### Important

This endpoint DOES NOT run workers yet.

It only creates records.

### Database Result

Example:

```text
SearchBatch #10

TruckSearchSession #21
TruckSearchSession #22
TruckSearchSession #23
```

### Initial Status

```text
pending
```

---

## GET `/searches/{search_batch_id}`

### Purpose

Retrieve one search batch.

### Used When

Frontend displays search overview.

Example:

```text
Search Batch #10

Status: pending
Total Trucks: 3
Completed: 0
Failed: 0
```

### Internal Flow

```text
Load batch
        ↓
Membership check
        ↓
Return batch
```

---

## GET `/searches/{search_batch_id}/truck-sessions`

### Purpose

List truck sessions belonging to one batch.

### Used When

Frontend displays per-truck search progress.

Example:

```text
Truck A → pending
Truck B → running
Truck C → completed
```

### Internal Flow

```text
Load batch
        ↓
Membership check
        ↓
Load truck sessions
        ↓
Return list
```

---

## GET `/truck-search-sessions/{truck_search_session_id}`

### Purpose

Retrieve one truck search session.

### Used When

Frontend needs detailed information for one truck search.

Example:

```text
Truck: 14
Owner User: 5
Status: pending
Timeout: 120
```

### Internal Flow

```text
Load session
        ↓
Membership check
        ↓
Return session
```

---

## POST `/truck-search-sessions/{truck_search_session_id}/cancel`

### Purpose

Cancel a truck search.

### Used When

Dispatcher decides to stop searching for one truck.

### Internal Flow

```text
Load session
        ↓
Membership check
        ↓
Check current status
        ↓
Update status to canceled
        ↓
Set completed_at
        ↓
Create worker log
        ↓
Return updated session
```

### Final Statuses

These cannot normally be modified further:

```text
completed
failed
canceled
timeout
```

---

# Relationship Between Phase 7 and Phase 8

## Phase 7 Stores

```text
Which load boards are available?
```

Example:

```text
DAT
TruckStop
123Loadboard
```

Stored through:

```text
LoadBoardSession
```

---

## Phase 8 Stores

```text
What searches are being performed?
```

Stored through:

```text
SearchBatch
TruckSearchSession
WorkerLog
```

---

## Future Architecture

Later the flow becomes:

```text
Dispatcher clicks Search
        ↓
SearchBatch
        ↓
TruckSearchSession
        ↓
Worker
        ↓
Load company LoadBoardSessions
        ↓
Search DAT
Search TruckStop
Search 123Loadboard
        ↓
Collect loads
        ↓
Normalize data
        ↓
Store results
```

This is why Phase 7 and Phase 8 are separate.

Phase 7 answers:

```text
What boards can be searched?
```

Phase 8 answers:

```text
What search operation is currently running?
```

---

# Phase 7 Done Criteria

- Company can create load-board sessions
- Company can list sessions
- Company can retrieve session details
- Session status can be updated
- Session health information can be stored

---

# Phase 8 Done Criteria

- SearchBatch can be created
- TruckSearchSessions can be created
- owner_user_id is stored
- Search statuses are tracked
- Worker logs can be stored
- Search sessions can be canceled
- Company membership checks are enforced
