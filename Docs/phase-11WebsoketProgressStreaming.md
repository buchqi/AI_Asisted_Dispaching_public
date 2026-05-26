# Phase 11 — WebSocket Progress Streaming

## Goal

Phase 11 introduces real-time communication between the backend and connected clients.

Before this phase, search progress could only be discovered by repeatedly calling REST endpoints and checking database records.

After Phase 11, the backend can push live search events directly to connected clients through WebSockets.

This allows dispatchers to see search progress in real time without refreshing pages or polling APIs.

---

# Why This Phase Exists

Before Phase 11:

```text
Dispatcher starts search
        ↓
Worker runs
        ↓
Database updates
        ↓
Frontend repeatedly calls API
        ↓
Frontend eventually discovers changes
```

This approach is called polling.

Example:

```http
GET /searches/15
GET /searches/15
GET /searches/15
GET /searches/15
```

Every few seconds.

Problems:

```text
Extra database queries
Extra HTTP requests
Higher server load
Delayed updates
Poor user experience
```

---

## Solution

Use WebSockets.

Instead of:

```text
Frontend repeatedly asks:
"Anything new?"
```

The backend says:

```text
"Something happened."
```

immediately.

---

# What Is a WebSocket?

A WebSocket is a long-lived connection between client and server.

Traditional REST:

```text
Client
   ↓ request
Server
   ↓ response
Connection closes
```

WebSocket:

```text
Client
   ↓ connect
Server
   ↓ accept
Connection stays open
```

Both sides can send messages at any time.

---

## REST vs WebSocket

REST:

```http
GET /searches/15
```

Response:

```json
{
  "status": "running"
}
```

Connection closes.

---

WebSocket:

```text
Connect once
```

Then server pushes:

```json
{
  "event_type": "worker.started"
}
```

Later:

```json
{
  "event_type": "loads.found"
}
```

Later:

```json
{
  "event_type": "search.completed"
}
```

No additional requests required.

---

# Architecture Added

Phase 11 introduces:

```text
ConnectionManager
WebSocket endpoints
Event system
Live worker broadcasting
```

---

# Files Added

Recommended structure:

```text
app/api/v1/websockets.py

app/websockets/
    connection_manager.py
    events.py

app/schemas/
    websocket.py
```

---

# ConnectionManager

File:

```text
app/websockets/connection_manager.py
```

---

## Purpose

Track active WebSocket connections.

Without ConnectionManager:

```text
Worker
    ↓
Which client should receive event?
```

Unknown.

---

With ConnectionManager:

```text
Worker
    ↓
ConnectionManager
    ↓
Find subscribed clients
    ↓
Broadcast event
```

---

## Responsibilities

Manage:

```text
Connect client
Disconnect client
Store connections
Broadcast events
Handle disconnects
```

---

## Internal Structure

Example:

```python
{
    2: [
        websocket_a,
        websocket_b
    ]
}
```

Meaning:

```text
Company #2 has two connected users.
```

---

# Event System

File:

```text
app/websockets/events.py
```

---

## Purpose

Create standardized event payloads.

Every event follows the same structure.

---

## Standard Event Shape

```json
{
  "event_type": "worker.started",
  "company_id": 2,
  "search_batch_id": 15,
  "truck_search_session_id": 21,
  "message": "Mock worker started.",
  "data": {},
  "timestamp": "2026-05-21T15:00:00Z"
}
```

---

## Why Standardization Matters

Without standards:

```json
{
  "event": "start"
}
```

and

```json
{
  "type": "worker_started"
}
```

and

```json
{
  "worker": "started"
}
```

become inconsistent.

Frontend becomes difficult to maintain.

---

With a standard event shape:

```json
{
  "event_type": "...",
  "message": "...",
  "data": {}
}
```

all events are predictable.

---

# WebSocket Channels

Phase 11 introduces two channels.

---

## Company Channel

Endpoint:

```text
WS /ws/companies/{company_id}
```

Purpose:

Receive company-wide activity.

Example future events:

```text
search started
search completed
load booked
dispatcher joined
driver assigned
```

---

## Search Channel

Endpoint:

```text
WS /ws/searches/{search_batch_id}
```

Purpose:

Receive events for one search only.

Example:

```text
worker started
loads found
search completed
```

Useful when viewing search progress screen.

---

# Authentication

## Why Authentication Is Required

Without authentication:

```text
Anyone can connect
Anyone can observe company activity
Anyone can receive search updates
```

Unacceptable.

---

## MVP Authentication Method

Current implementation uses:

```text
ws://host/ws/companies/2?token=JWT_TOKEN
```

Connection flow:

```text
Connect
    ↓
Read token
    ↓
Validate JWT
    ↓
Load user
    ↓
Verify membership
    ↓
Accept connection
```

---

## Membership Verification

Authentication alone is not enough.

Example:

User A belongs to:

```text
Company 2
```

User A should NOT receive:

```text
Company 5 events
```

Therefore:

```text
CompanyMembership
status == active
```

must be verified before accepting connection.

---

# Security Risks

## Current MVP Risk

JWT token is sent in URL:

```text
ws://host/ws/companies/2?token=...
```

Potential exposure:

```text
Browser history
Server logs
Proxy logs
Monitoring systems
Shared screenshots
Copied URLs
```

Because token is part of URL.

---

## Why This Is Acceptable For MVP

Current environment:

```text
Local development
Internal testing
Short-lived tokens
No sensitive payloads
```

This allows rapid development and easy testing.

---

## Production Recommendation

Replace query-token authentication with:

### Authorization Header

```text
Authorization: Bearer JWT
```

or

### Secure HttpOnly Cookie

```text
Browser automatically sends cookie
Token hidden from JavaScript
```

---

## Additional Production Security Checklist

Before production:

```text
[ ] Remove token-in-query approach
[ ] Support token expiration handling
[ ] Use secure cookies or headers
[ ] Add connection rate limiting
[ ] Add idle timeout
[ ] Log connection attempts
[ ] Validate company membership
[ ] Validate search ownership when needed
```

---

# Worker Broadcasting

Phase 11 connects workers to WebSockets.

Before:

```text
Worker
    ↓
Create WorkerLog
```

After:

```text
Worker
    ↓
Create WorkerLog
    ↓
Broadcast WebSocket Event
```

Both happen simultaneously.

---

# Event Flow

Example:

```text
Worker starts
```

Creates:

```text
WorkerLog
```

and broadcasts:

```json
{
  "event_type": "worker.started"
}
```

---

# Current Event Types

Supported events:

```text
search.started
worker.started
load_board.connected
loads.found
worker.completed
worker.failed
search.completed
search.failed
```

---

# Search Lifecycle

Current live search flow:

```text
Dispatcher clicks Search
        ↓
SearchBatch created
        ↓
search.started
        ↓
worker.started
        ↓
load_board.connected
        ↓
loads.found
        ↓
worker.completed
        ↓
search.completed
```

Each step is streamed in real time.

---

# Background Execution

## Problem

Originally:

```text
POST /searches/start
```

created records and immediately executed workers.

The request stayed busy until search finished.

This made streaming difficult.

---

## Solution

Use background execution.

Flow:

```text
POST /searches/start
        ↓
Create records
        ↓
Return response
        ↓
Background worker starts
        ↓
WebSocket events stream live
```

Now frontend can connect while search is running.

---

# Manual Testing

No frontend is required.

---

## Step 1

Run backend:

```bash
uvicorn app.main:app --reload
```

---

## Step 2

Connect Postman WebSocket:

```text
ws://127.0.0.1:8000/ws/companies/2?token=JWT
```

Expected:

```text
Connected
```

---

## Step 3

Start search through Swagger:

```http
POST /searches/start
```

---

## Step 4

Observe events in Postman:

```json
{
  "event_type": "search.started"
}
```

```json
{
  "event_type": "worker.started"
}
```

```json
{
  "event_type": "loads.found"
}
```

```json
{
  "event_type": "search.completed"
}
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
WebSocket infrastructure
```

Purpose:

```text
Stream search progress live
```

---

# Current Architecture

```text
Dispatcher starts search
        ↓
SearchBatch
        ↓
TruckSearchSessions
        ↓
WorkerManager
        ↓
MockSearchWorker
        ↓
WorkerLog
        ↓
WebSocket Event
        ↓
ConnectionManager
        ↓
Connected Clients
```

---

# What Frontend Can Now Do

Frontend can:

```text
Show live progress
Show load discovery count
Show worker state changes
Show completion events
Display search timeline
```

without polling APIs.

---

# What Is Still Missing

Phase 11 does not yet include:

```text
Real browser automation
Redis pub/sub
Multi-server websocket scaling
Advanced event persistence
AI scoring updates
Booking updates
Notification system
```

These will be added later.

---

# What Phase 11 Proves

Phase 11 proves:

```text
Clients can connect securely
Authentication works
Membership validation works
Workers can broadcast events
Search progress streams live
Frontend can receive updates without polling
```

This is the first real-time infrastructure layer of the dispatching platform.

---

# Done Criteria

Phase 11 is complete when:

```text
Frontend/client can connect to WebSocket
Company channel works
Search channel works
JWT authentication works
Membership validation works
Worker events are broadcast
Search completion events are broadcast
Mock search progress appears live
```
