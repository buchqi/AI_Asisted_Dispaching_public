# Phase 10 — Load Result Storage

## Goal

Phase 10 introduces the first real storage layer for search results.

Before this phase, searches could run and generate mock loads, but those loads only existed temporarily inside the worker execution process.

After Phase 10, search results become permanent database records that can be retrieved through the API and later used for:

- scoring
- ranking
- AI explanations
- booking workflows
- dispatcher review
- historical search analysis

This phase establishes the core load data architecture that future phases will build upon.

---

# Why This Phase Exists

Before Phase 10:

```text
Dispatcher starts search
        ↓
Mock worker runs
        ↓
Mock loads generated
        ↓
Worker logs created
        ↓
Search completed
```

However:

```text
No load records existed
No load history existed
No API endpoint returned loads
Frontend had nothing to display
```

The search engine worked, but the actual load data disappeared after execution.
w
Phase 10 solves that problem.

---

# What Was Added

Phase 10 introduces three new models:

```text
Load
LoadSnapshot
LoadSource
```

Together these models represent:

```text
What was found?
When was it found?
Where did it come from?
```

---

# Core Architecture

The architecture intentionally separates stable information from changing information.

Instead of storing everything in one huge table:

```text
Load
```

the system uses three specialized tables.

---

# Load Model

## Purpose

Represents the stable identity of a load.

File:

```text
app/models/load.py
```

---

## Why We Need It

The same practical load may appear:

- on DAT
- on TruckStop
- on 123Loadboard

Without deduplication:

```text
Load A
Load A
Load A
```

would be stored three times.

Instead:

```text
One Load
Multiple Sources
Multiple Snapshots
```

---

## Example

```text
Load #25

Broker:
ABC Logistics

Equipment:
REEFER

Origin:
Atlanta, GA

Destination:
Dallas, TX
```

This represents the load itself.

---

## Stable Fields

Load stores information that rarely changes:

```text
Broker
Equipment type
Origin
Destination
```

These fields are used to identify the load.

---

# LoadSnapshot Model

## Purpose

Represents what was observed during a search.

File:

```text
app/models/load_snapshot.py
```

---

## Why We Need It

Load information changes over time.

Example:

Morning:

```text
Rate: $2200
```

Afternoon:

```text
Rate: $2500
```

Same load.

Different observation.

If we overwrite the old data:

```text
History is lost
```

Instead we create snapshots.

---

## Example

Search #1:

```text
Rate: 2200
Miles: 950
Weight: 42000
```

Search #2:

```text
Rate: 2500
Miles: 950
Weight: 42000
```

Both snapshots point to:

```text
Load #25
```

---

## Stored Fields

Examples:

```text
Rate
Miles
Weight
Pickup Date
Delivery Date
Raw Payload
```

These are search-time observations.

---

# LoadSource Model

## Purpose

Represents where the load came from.

File:

```text
app/models/load_source.py
```

---

## Why We Need It

The same load can appear on multiple load boards.

Example:

```text
DAT
TruckStop
123Loadboard
```

If we do not track source information:

```text
We lose visibility into origin
```

---

## Example

Load:

```text
Atlanta → Dallas
```

appears on:

```text
DAT
```

and:

```text
TruckStop
```

The system stores:

```text
Load
        ↓
LoadSnapshot
        ↓
LoadSource
```

for each source.

---

## Stored Fields

Examples:

```text
Load Board Name
External Load ID
Source URL
Contact Email
Contact Phone
```

---

# Deduplication System

## Purpose

Prevent storing identical loads multiple times.

File:

```text
app/utils/deduplication.py
```

---

## Why We Need It

Without deduplication:

```text
DAT load
TruckStop load
123Loadboard load
```

become:

```text
3 duplicate loads
```

With deduplication:

```text
1 Load
Multiple Sources
Multiple Snapshots
```

---

## Deduplication Key

The key is built from:

```text
Broker
Equipment Type
Origin
Destination
Rate
Weight
```

Example:

```text
abc logistics|
reefer|
atlanta|
ga|
dallas|
tx|
2200|
42000
```

This string becomes the unique fingerprint.

---

## Result

If another board returns the same practical load:

```text
Existing Load reused
New Source created
New Snapshot created
```

---

# Load Service

File:

```text
app/services/load_service.py
```

---

## Purpose

Centralized business logic for load storage.

The service is responsible for:

```text
Creating Loads
Creating Snapshots
Creating Sources
Deduplication
Retrieving Loads
```

---

# Main Service Flow

When a worker produces raw load data:

```text
Raw Load
        ↓
Build Deduplication Key
        ↓
Find Existing Load
        ↓
Create Load if Needed
        ↓
Create Snapshot
        ↓
Create Source
        ↓
Save
```

---

# How Mock Worker Changed

Before Phase 10:

```text
Generate mock loads
        ↓
Write worker log
        ↓
Finish
```

After Phase 10:

```text
Generate mock loads
        ↓
LoadService.store_raw_load_results()
        ↓
Create Load
        ↓
Create Snapshot
        ↓
Create Source
        ↓
Write worker log
        ↓
Finish
```

This means search results are now persisted.

---

# New API Endpoints

---

## GET `/truck-search-sessions/{truck_search_session_id}/loads`

### Purpose

Retrieve load results for one truck search session.

### Used By

Frontend search results page.

Example:

```text
Truck Search Session #15

Found:
Load A
Load B
Load C
```

---

### Internal Flow

```text
Load TruckSearchSession
        ↓
Membership check
        ↓
Query snapshots
        ↓
Return results
```

---

## GET `/loads/{load_id}`

### Purpose

Retrieve stable load information.

### Used By

Detailed load view.

Example:

```text
Broker
Origin
Destination
Equipment
```

---

### Internal Flow

```text
Load Load
        ↓
Membership check
        ↓
Return Load
```

---

## GET `/load-snapshots/{load_snapshot_id}`

### Purpose

Retrieve a specific search-time observation.

### Used By

Load detail/history view.

Example:

```text
Rate
Miles
Weight
Pickup Date
Delivery Date
```

---

### Internal Flow

```text
Load Snapshot
        ↓
Membership check
        ↓
Return Snapshot
```

---

# Relationship With Previous Phases

---

## Phase 7

Created:

```text
LoadBoardSession
```

Purpose:

```text
Which boards can company use?
```

---

## Phase 8

Created:

```text
SearchBatch
TruckSearchSession
WorkerLog
```

Purpose:

```text
Track search execution
```

---

## Phase 9

Created:

```text
WorkerManager
MockSearchWorker
```

Purpose:

```text
Execute search workflow
```

---

## Phase 10

Created:

```text
Load
LoadSnapshot
LoadSource
```

Purpose:

```text
Persist search results
```

---

# Complete Flow After Phase 10

Current architecture:

```text
Dispatcher starts search
        ↓
SearchBatch created
        ↓
TruckSearchSessions created
        ↓
WorkerManager starts worker
        ↓
MockSearchWorker generates loads
        ↓
LoadService stores results
        ↓
Load created
        ↓
LoadSnapshot created
        ↓
LoadSource created
        ↓
Worker logs created
        ↓
Search completed
```

---

# Database Relationships

Current structure:

```text
Company
    ↓
SearchBatch
    ↓
TruckSearchSession
    ↓
LoadSnapshot
    ↓
Load
```

And:

```text
Load
    ↓
LoadSource
```

And:

```text
TruckSearchSession
    ↓
WorkerLog
```

---

# What Frontend Can Now Do

For the first time, frontend can:

```text
Display search results
Open load details
View load history
Show load sources
Refresh search results
```

Because actual load data now exists in the database.

---

# What Future Phases Will Use

Phase 10 becomes the foundation for:

```text
Load scoring
Load ranking
AI explanations
Load filtering
Dispatcher actions
Save/favorite
Reject
Contacted status
Booking
Historical analysis
```

All of those features need load records first.

Phase 10 provides those records.

---

# What Is Still Missing

Phase 10 still does not include:

```text
Real DAT scraping
Real TruckStop scraping
Load normalization engine
Advanced deduplication
AI scoring
Booking workflow
WebSockets
Real-time updates
```

Those will be added later.

---

# What Phase 10 Proves

Phase 10 proves that:

```text
Searches produce persistent results
Results can be deduplicated
Results can be retrieved via API
Results maintain source information
Results maintain search history
```

This is the first phase where the system starts behaving like a real dispatching platform instead of a search simulation.

---

# Done Criteria

Phase 10 is complete when:

```text
Mock worker stores Load records
Mock worker stores LoadSnapshot records
Mock worker stores LoadSource records
Deduplication works
Search results are retrievable
Load details are retrievable
Snapshot details are retrievable
Frontend can display search results
```
