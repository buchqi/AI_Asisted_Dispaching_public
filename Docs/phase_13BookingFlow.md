# Phase 13 — Booking Flow

## Goal

Phase 13 adds the booking workflow.

Before this phase, dispatchers could:

- search loads
- view load results
- save loads
- reject loads
- favorite loads
- mark loads as contacted

But they could not officially book a load.

After Phase 13, a dispatcher can select a load, book it, connect it to a truck and driver, store the final negotiated rate, and track booking status.

---

# Why This Phase Exists

Search results are only useful if dispatchers can turn them into real booked work.

A dispatching system needs to answer:

```text
Which load was booked?
Which truck is assigned?
Which driver is assigned?
Who booked it?
What was the posted rate?
What was the final negotiated rate?
What is the current operational status?
```

Phase 13 creates that booking history.

---

# What Was Added

Phase 13 introduces:

```text
BookedLoad
BookingService
Booking schemas
Booking API endpoints
Booked-load status updates
Duplicate booking prevention
```

---

# BookedLoad Model

File:

```text
app/models/booked_load.py
```

---

## Purpose

Stores company booking history.

A `BookedLoad` represents a load that was selected by a dispatcher and officially booked.

---

## Main Fields

```text
company_id
load_id
load_snapshot_id
truck_search_session_id
truck_id
driver_id
dispatcher_user_id
broker_name
equipment_type
origin_city
origin_state
destination_city
destination_state
pickup_date
delivery_date
posted_rate
final_rate
miles
weight
status
notes
created_at
updated_at
```

---

# Why Booking Copies Load Data

BookedLoad copies important load information at booking time.

Example copied fields:

```text
broker_name
origin
destination
pickup_date
delivery_date
posted_rate
miles
weight
```

Reason:

```text
Load data can change later,
but booking history must stay stable.
```

Example:

```text
Original posted rate: 2400
Final negotiated rate: 2700
```

Even if the load snapshot changes later, the booking record still preserves what was booked.

---

# Booking Statuses

Possible statuses:

```text
booked
picked_up
delivered
canceled
```

---

## booked

Load has been booked but not yet picked up.

## picked_up

Driver has picked up the load.

## delivered

Load has been delivered.

## canceled

Booking was canceled.

---

# New Endpoints

---

## POST `/loads/{load_id}/book`

### Purpose

Book a selected load.

### Used When

Dispatcher chooses a load and confirms booking.

---

### Example Request

```json
{
  "truck_id": 1,
  "driver_id": 1,
  "load_snapshot_id": 5,
  "final_rate": 2700,
  "notes": "Broker confirmed final rate."
}
```

---

### Internal Flow

```text
Load selected Load
        ↓
Validate current user membership
        ↓
Validate load snapshot
        ↓
Validate truck belongs to company
        ↓
Validate driver belongs to company
        ↓
Validate search ownership if snapshot came from search session
        ↓
Prevent duplicate active booking
        ↓
Create BookedLoad
        ↓
Copy load/snapshot fields
        ↓
Store final negotiated rate
        ↓
Return booking
```

---

### Important Validation

The system checks:

```text
Load exists
Truck belongs to same company
Driver belongs to same company
User belongs to company
User owns search session if booking from active search result
Load is not already actively booked
```

---

## GET `/companies/{company_id}/booked-loads`

### Purpose

List booked loads for a company.

### Used When

Company wants to view booking history.

Example future UI:

```text
Booked Loads

Load #1 | Atlanta → Dallas | booked
Load #2 | Miami → Chicago | picked_up
Load #3 | Atlanta → Houston | delivered
```

---

### Internal Flow

```text
Validate company membership
        ↓
Query booked loads
        ↓
Return newest first
```

---

## GET `/booked-loads/{booked_load_id}`

### Purpose

Get details for one booked load.

### Used When

Dispatcher/admin opens booking detail page.

---

### Internal Flow

```text
Load booking
        ↓
Validate company membership
        ↓
Return booking details
```

---

## PATCH `/booked-loads/{booked_load_id}`

### Purpose

Update booking status, final rate, or notes.

---

### Example: Mark Picked Up

```json
{
  "status": "picked_up"
}
```

---

### Example: Mark Delivered

```json
{
  "status": "delivered"
}
```

---

### Example: Update Final Rate

```json
{
  "final_rate": 2800,
  "notes": "Final rate updated after negotiation."
}
```

---

### Internal Flow

```text
Load booking
        ↓
Validate company membership
        ↓
Update allowed fields
        ↓
Save
        ↓
Return updated booking
```

---

# Duplicate Booking Prevention

The system prevents accidental duplicate active booking.

Example:

```text
Load #25 already has status booked
```

If dispatcher tries to book it again:

```text
400 Bad Request
```

Reason:

```text
Same load should not be actively booked twice.
```

---

## Blocking Statuses

Duplicate booking is blocked if existing booking status is:

```text
booked
picked_up
```

---

## Non-blocking Statuses

Future booking may be allowed if old booking is:

```text
delivered
canceled
```

For MVP, this keeps the system simple but safe.

---

# Relationship With Previous Phases

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

## Phase 12

Created:

```text
DispatcherAction
```

Purpose:

```text
Allow save/reject/favorite/contact actions
```

---

## Phase 13

Created:

```text
BookedLoad
```

Purpose:

```text
Convert selected search result into official booked work
```

---

# Current Workflow After Phase 13

```text
Dispatcher starts search
        ↓
Mock worker finds loads
        ↓
Loads are stored
        ↓
Dispatcher reviews results
        ↓
Dispatcher saves/favorites/contacts load
        ↓
Dispatcher books selected load
        ↓
BookedLoad is created
        ↓
Booking status is updated over time
```

---

# Database Relationship

```text
Company
    ↓
BookedLoad
```

```text
BookedLoad
    ↓
Load
```

```text
BookedLoad
    ↓
LoadSnapshot
```

```text
BookedLoad
    ↓
Truck
```

```text
BookedLoad
    ↓
Driver
```

```text
BookedLoad
    ↓
Dispatcher User
```

---

# Why This Matters For The Product

Phase 13 turns the project from:

```text
search and review tool
```

into:

```text
dispatch workflow tool
```

Because now the system stores real operational outcomes:

```text
which loads were booked
for which trucks
with which drivers
at what final rate
by which dispatcher
```

This is critical for future analytics and AI.

---

# Future Features Built On Booked Loads

BookedLoad records will later support:

```text
Revenue tracking
Dispatcher performance
Driver history
Broker history
Rate analysis
AI recommendations
Profitability analysis
Invoice workflow
Delivered/canceled reports
```

---

# What Is Still Missing

Phase 13 does not include:

```text
Invoice generation
Document upload
Rate confirmation storage
Payment status
Carrier packet workflow
Advanced operational tracking
AI scoring
Frontend UI
```

Those can be added later.

---

# Done Criteria

Phase 13 is complete when:

```text
Dispatcher can book a load
Booked load is connected to company
Booked load is connected to truck
Booked load is connected to driver if provided
Booked load is connected to dispatcher
Posted rate is copied
Final negotiated rate is stored
Booking status can be updated
Company booked-load history works
Duplicate active bookings are blocked
```
