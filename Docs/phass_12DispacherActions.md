# Phase 12 — Dispatcher Actions

## Goal

Phase 12 introduces dispatcher interaction with search results.

Before this phase, dispatchers could:

- start searches
- view search results
- view load details

But they could not actually interact with loads.

After Phase 12, dispatchers can:

- save loads
- reject loads
- favorite loads
- mark loads as contacted

while the system stores a complete history of those actions.

This phase introduces the first dispatcher decision layer on top of search results.

---

# Why This Phase Exists

Finding loads is only part of dispatching.

A dispatcher must also decide:

```text
Which loads are worth considering?
Which loads should be ignored?
Which loads have already been contacted?
Which loads should be revisited later?
```

Without action tracking:

```text
Dispatcher sees same loads repeatedly
No history exists
No workflow exists
No ownership protection exists
```

Phase 12 solves these problems.

---

# What Was Added

Phase 12 introduces:

```text
DispatcherAction
DispatcherActionService
Ownership validation
Load action endpoints
Action history
```

---

# Core Concept

Searches belong to a dispatcher.

Example:

```text
Dispatcher A
        ↓
SearchBatch #10
        ↓
TruckSearchSession #25
```

Loads discovered during that search belong to the workflow of Dispatcher A.

Therefore:

```text
Dispatcher A can manipulate results
Dispatcher B cannot manipulate results
```

while the search remains active.

---

# DispatcherAction Model

File:

```text
app/models/dispatcher_action.py
```

---

## Purpose

Store dispatcher decisions made on load results.

Each action becomes a historical record.

Examples:

```text
Saved load
Rejected load
Favorited load
Marked contacted
```

---

## Why Separate Table?

Without action history:

```text
Load
    saved = true
```

Only current state exists.

No history.

No audit trail.

No timeline.

---

With DispatcherAction:

```text
Load Saved
        ↓
Load Contacted
        ↓
Load Rejected
```

All actions remain visible.

---

# DispatcherAction Fields

Examples:

```text
company_id
truck_search_session_id
load_id
load_snapshot_id
dispatcher_user_id
action_type
note
created_at
```

---

## action_type

Allowed values:

```text
saved
rejected
favorited
contacted
```

These represent dispatcher decisions.

---

## note

Optional explanation.

Examples:

```text
Rate too low
```

```text
Good backup option
```

```text
Broker contacted, waiting callback
```

---

# Ownership Protection

One of the most important features of Phase 12.

---

## Problem

Multiple dispatchers may belong to same company.

Example:

```text
Dispatcher A
Dispatcher B
Dispatcher C
```

Dispatcher A starts search:

```text
TruckSearchSession #25
```

Without protection:

```text
Dispatcher B can reject loads
Dispatcher C can favorite loads
Dispatcher B can contact brokers
```

creating conflicts.

---

## Solution

Ownership Validation.

Rule:

```text
Only owner dispatcher may manipulate search results.
```

Validation:

```python
truck_search_session.owner_user_id
==
current_user.id
```

---

## Example

Dispatcher A:

```text
owner_user_id = 5
```

Current user:

```text
user_id = 5
```

Allowed.

---

Current user:

```text
user_id = 7
```

Result:

```text
403 Forbidden
```

---

# Permissions Layer

File:

```text
app/core/permissions.py
```

---

## Purpose

Centralize ownership checks.

Example helper:

```python
require_truck_search_session_owner(...)
```

Responsibilities:

```text
Verify ownership
Raise 403 if unauthorized
Prevent manipulation by other dispatchers
```

---

# DispatcherActionService

File:

```text
app/services/dispatcher_action_service.py
```

---

## Purpose

Contain all dispatcher action business logic.

API routes should remain thin.

Service handles:

```text
Validation
Ownership checks
Load checks
Action creation
Duplicate prevention
History retrieval
```

---

# Action Flow

Example:

Dispatcher saves load.

Flow:

```text
POST save endpoint
        ↓
Load TruckSearchSession
        ↓
Validate membership
        ↓
Validate ownership
        ↓
Validate load belongs to search
        ↓
Create DispatcherAction
        ↓
Store history
        ↓
Return response
```

---

# Load Validation

Important rule:

A dispatcher cannot act on arbitrary loads.

The load must belong to the search session.

Validation:

```text
LoadSnapshot
    truck_search_session_id
```

must match:

```text
Requested truck_search_session_id
```

This prevents manipulation of unrelated loads.

---

# Duplicate Action Protection

Problem:

Dispatcher repeatedly clicks:

```text
Save
Save
Save
Save
```

Without protection:

```text
4 identical rows
```

stored.

---

Solution:

Before creating action:

```text
Check existing action
```

If already exists:

```text
Return existing action
```

instead of creating duplicates.

---

## Example

Existing:

```text
Load #15
Saved by Dispatcher #5
```

Second save request:

```text
No new row created
Existing action returned
```

---

# New Endpoints

Phase 12 introduces four dispatcher action endpoints.

---

## Save Load

```http
POST /truck-search-sessions/{truck_search_session_id}/loads/{load_id}/save
```

---

### Purpose

Mark load as saved.

Example:

```text
Interesting load
Review later
```

---

### Request

```json
{
  "note": "Looks good for this driver."
}
```

---

### Result

Creates:

```text
DispatcherAction
action_type = saved
```

---

# Reject Load

```http
POST /truck-search-sessions/{truck_search_session_id}/loads/{load_id}/reject
```

---

### Purpose

Reject load.

Examples:

```text
Rate too low
Wrong destination
Bad broker
```

---

### Request

```json
{
  "note": "Rate too low."
}
```

---

### Result

Creates:

```text
DispatcherAction
action_type = rejected
```

---

# Favorite Load

```http
POST /truck-search-sessions/{truck_search_session_id}/loads/{load_id}/favorite
```

---

### Purpose

Mark load as favorite.

Useful for:

```text
Best options
Backup options
Potential negotiations
```

---

### Request

```json
{
  "note": "Good backup option."
}
```

---

### Result

Creates:

```text
DispatcherAction
action_type = favorited
```

---

# Mark Contacted

```http
POST /truck-search-sessions/{truck_search_session_id}/loads/{load_id}/contacted
```

---

### Purpose

Track broker communication.

Examples:

```text
Called broker
Sent email
Waiting callback
```

---

### Request

```json
{
  "note": "Called broker, waiting response."
}
```

---

### Result

Creates:

```text
DispatcherAction
action_type = contacted
```

---

# Action History

Every action becomes a historical record.

Example timeline:

```text
10:00 Saved
10:05 Favorited
10:15 Contacted
10:45 Rejected
```

Nothing is lost.

This becomes valuable for:

```text
Auditing
Performance analysis
Dispatcher history
Future reporting
```

---

# Load Result State

Phase 12 allows load results to expose action state.

Example:

```json
{
  "load_id": 15,
  "is_saved": true,
  "is_rejected": false,
  "is_favorited": true,
  "is_contacted": true
}
```

Frontend can immediately display:

```text
⭐ Favorited
✓ Saved
☎ Contacted
```

without additional queries.

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
Store company load-board records
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
Track searches
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
Execute searches
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
Store search results
```

---

## Phase 11

Created:

```text
WebSocket Progress Streaming
```

Purpose:

```text
Broadcast search events
```

---

## Phase 12

Created:

```text
Dispatcher Actions
```

Purpose:

```text
Allow dispatchers to interact with load results
```

---

# Current Workflow

After Phase 12:

```text
Dispatcher starts search
        ↓
SearchBatch
        ↓
TruckSearchSessions
        ↓
MockSearchWorker
        ↓
Load results stored
        ↓
Dispatcher reviews loads
        ↓
Save
Reject
Favorite
Contact
        ↓
DispatcherAction stored
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

Actions:

```text
DispatcherAction
    ↓
Load
```

and:

```text
DispatcherAction
    ↓
TruckSearchSession
```

and:

```text
DispatcherAction
    ↓
Dispatcher User
```

---

# Why Ownership Matters

Without ownership controls, multiple dispatchers can interact with the same search simultaneously, leading to conflicting actions and inconsistent workflow states.

Example:

Dispatcher A saves a load.
Dispatcher B rejects the same load.
Dispatcher C contacts the broker.

As a result, the system loses a clear source of responsibility, creating confusion and making it difficult to track the actual status of the load.

Ownership enforcement solves this problem by assigning a single active dispatcher to a search session. That dispatcher is responsible for all operational decisions within the workflow, while other company members can monitor progress in a read-only capacity.

This ensures:

- Clear accountability
- Consistent load status management
- Elimination of conflicting actions
- Predictable workflow behavior
- Better team coordination

---

# Future Uses

Dispatcher actions are not just operational records—they form the foundation for many future platform capabilities.

The action history collected during search sessions can later be used to support:

- Load booking workflows
- AI-powered recommendations
- Dispatcher performance analytics
- Activity timelines and auditing
- Negotiation tracking
- Load pipeline management
- CRM-style operational workflows

Because of this, storing dispatcher actions early in the platform's lifecycle is a critical architectural decision. Many advanced features will rely on this historical data.

---

# What Is Still Missing

Phase 12 introduces dispatcher interactions but does not yet implement the full load lifecycle.

The following capabilities are planned for future phases:

- Action reversal (undo functionality)
- Load booking workflows
- Broker negotiation management
- Operational load status pipelines
- AI scoring integration
- AI-generated explanations
- Automated load recommendations

These features will build upon the action-tracking foundation established in this phase.

---

# What Phase 12 Proves

Phase 12 validates that search results can transition from passive information to actionable workflow objects.

Specifically, it proves that:

- Dispatchers can perform actions on search results
- Ownership enforcement correctly restricts conflicting operations
- Action history is stored and auditable
- Duplicate actions are prevented
- Load state changes can be tracked over time
- Search sessions can serve as the starting point of a complete dispatch workflow

This represents a significant milestone in the system's evolution, as search results are no longer read-only records but become active entities that dispatchers can manage and act upon.
