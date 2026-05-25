# AI-Assisted Dispatching MVP — Database Tables & Domain Modeling

## 1. Database Modeling Goal

The database model is designed to support a multi-company dispatching platform where dispatchers can manage trucks, drivers, load-board sessions, searches, search results, dispatcher decisions, scoring, AI explanations, and booked-load history.

The MVP database should support:

```txt
Multiple companies
Multiple users per company
Users working in more than one company
Company-wide trucks
Company-wide drivers
Company-level load-board sessions
One-time truck searches
Concurrent search sessions
Stored search results
Load deduplication
Dispatcher actions
Booked-load history
Rule-based scoring
AI explanations
Worker/debug logs
```

---

## 2. Core Domain Overview

```txt
User
  |
  v
CompanyMembership
  |
  v
Company
  |
  |-- Truck
  |-- Driver
  |-- LoadBoardSession
  |-- SearchBatch
  |-- BookedLoad
```

Main idea:

```txt
Users do not directly own trucks or drivers.
Companies own trucks, drivers, load-board sessions, searches, and booked loads.
Users access company data through CompanyMembership.
```

---

## 3. Main Entity Groups

The database can be divided into these main groups:

```txt
User & Company Tables
Truck & Driver Tables
Load Board Session Tables
Search Tables
Load Result Tables
Dispatcher Action Tables
Booked Load Tables
Scoring & AI Tables
Worker / Debug Tables
```

---

# 4. User & Company Tables

## 4.1 users

Stores platform users.

A user can be a dispatcher or an admin depending on their membership inside a company.

### Fields

```txt
id
email
password_hash
full_name
phone
timezone
profile_info
is_active
created_at
updated_at
```

### Field Notes

```txt
id:
Primary key.

email:
Unique login email.

password_hash:
Stored hashed password, never plain text.

full_name:
User display name.

phone:
Optional phone number.

timezone:
Useful because dispatchers may work from different locations.

profile_info:
Optional JSON/text field for extra user profile data.

is_active:
Used to disable user account without deleting it.

created_at / updated_at:
Standard timestamps.
```

### Relationships

```txt
User -> many CompanyMemberships
User -> many SearchBatches started
User -> many TruckSearchSessions owned
User -> many DispatcherActions
User -> many BookedLoads
User -> many ScoringPreferences
```

---

## 4.2 companies

Stores dispatch companies.

### Fields

```txt
id
name
created_at
updated_at
```

### Field Notes

```txt
id:
Primary key.

name:
Company name.

created_at / updated_at:
Standard timestamps.
```

### Relationships

```txt
Company -> many CompanyMemberships
Company -> many Trucks
Company -> many Drivers
Company -> many LoadBoardSessions
Company -> many SearchBatches
Company -> many BookedLoads
Company -> many ScoringPreferences
```

---

## 4.3 company_memberships

Connects users to companies.

This table allows one user to work in multiple companies if supporting that is cheap enough during MVP development.

### Fields

```txt
id
user_id
company_id
role
status
invited_by_user_id
created_at
updated_at
```

### Roles

```txt
admin
dispatcher
```

### Statuses

```txt
active
invited
removed
disabled
```

### Field Notes

```txt
user_id:
Foreign key to users.id.

company_id:
Foreign key to companies.id.

role:
Simple MVP role system.

status:
Controls whether the user currently has access.

invited_by_user_id:
Optional reference to the admin who invited this user.

created_at / updated_at:
Standard timestamps.
```

### Relationships

```txt
User -> many CompanyMemberships
Company -> many CompanyMemberships
```

### Business Rules

```txt
A user can belong to multiple companies.
A company can have many users.
Only company admins can invite or remove users.
Roles should stay simple for MVP.
```

---

# 5. Truck & Driver Tables

## 5.1 trucks

Stores company trucks.

Important:

```txt
truck_id is the internal company truck number.
truck_id is not the database primary key.
```

### Fields

```txt
id
company_id
truck_id
current_driver_id
current_driver_name
current_driver_surname
equipment_type
status
notes
created_at
updated_at
```

### Statuses

```txt
available
searching
covered
inactive
maintenance
```

### Field Notes

```txt
id:
Database primary key.

company_id:
Foreign key to companies.id.

truck_id:
Internal company truck number, visible to dispatchers.

current_driver_id:
Optional foreign key to drivers.id.

current_driver_name:
Quick display field.

current_driver_surname:
Quick display field.

equipment_type:
Dry van, reefer, flatbed, box truck, etc.

status:
Current operational status.

notes:
Optional dispatcher notes.

created_at / updated_at:
Standard timestamps.
```

### Relationships

```txt
Company -> many Trucks
Truck -> optional current Driver
Truck -> many TruckSearchSessions
Truck -> many BookedLoads
```

### Business Rules

```txt
Trucks belong to companies.
Truck number should be unique inside one company.
Drivers can change trucks.
Truck keeps current driver display fields for faster UI visibility.
Driver full information is stored separately in the Driver table.
```

---

## 5.2 drivers

Stores full driver information.

### Fields

```txt
id
company_id
first_name
last_name
phone
email
home_location
preferences
notes
status
created_at
updated_at
```

### Statuses

```txt
active
inactive
unassigned
on_load
unavailable
```

### Field Notes

```txt
id:
Primary key.

company_id:
Foreign key to companies.id.

first_name / last_name:
Driver name.

phone:
Driver phone number.

email:
Optional driver email.

home_location:
Driver base location.

preferences:
JSON/text field for driver preferences.

notes:
Dispatcher notes.

status:
Current driver status.

created_at / updated_at:
Standard timestamps.
```

### Relationships

```txt
Company -> many Drivers
Driver -> many Trucks over time
Driver -> many BookedLoads
```

### Business Rules

```txt
Drivers belong to companies.
Drivers can be unassigned.
Drivers can change trucks.
Driver information should not be lost when truck assignment changes.
Driver preferences can later influence scoring.
```

---

# 6. Load Board Session Tables

## 6.1 load_board_sessions

Stores company-level login/session state for load boards.

Load-board sessions belong to the company, not to one dispatcher.

### Fields

```txt
id
company_id
load_board_name
session_status
session_health
expires_at
last_checked_at
last_successful_use_at
debug_notes
created_at
updated_at
```

### Load Board Examples

```txt
DAT
Truckstop
123Loadboard
Other future boards
```

### Session Statuses

```txt
active
expired
needs_login
failed
disabled
```

### Field Notes

```txt
id:
Primary key.

company_id:
Foreign key to companies.id.

load_board_name:
Name of load board.

session_status:
Current session state.

session_health:
Debug/health information.

expires_at:
When the session may expire.

last_checked_at:
Last time system checked session.

last_successful_use_at:
Last time worker successfully used this session.

debug_notes:
Useful for browser automation debugging.

created_at / updated_at:
Standard timestamps.
```

### Relationships

```txt
Company -> many LoadBoardSessions
LoadBoardSession -> used by search workers
```

### Business Rules

```txt
Company-level session is used first.
Dispatchers log into load-board websites normally.
Workers reuse saved company sessions.
Expired sessions require relogin.
Session health should be stored for debugging.
```

---

# 7. Search Tables

## 7.1 search_batches

Represents one dispatcher-started search action.

Example:

```txt
Dispatcher selects 5 trucks and clicks Start Search.
System creates 1 SearchBatch.
System creates 5 TruckSearchSessions.
```

### Fields

```txt
id
company_id
started_by_user_id
status
created_at
started_at
completed_at
error_message
```

### Statuses

```txt
pending
running
completed
failed
cancelled
partial
```

### Field Notes

```txt
id:
Primary key.

company_id:
Foreign key to companies.id.

started_by_user_id:
Foreign key to users.id.

status:
Overall search batch status.

created_at:
When batch record was created.

started_at:
When search execution started.

completed_at:
When all truck searches finished.

error_message:
Optional high-level error.
```

### Relationships

```txt
Company -> many SearchBatches
User -> many SearchBatches started
SearchBatch -> many TruckSearchSessions
```

### Business Rules

```txt
SearchBatch is the parent search object.
One SearchBatch can contain many TruckSearchSessions.
SearchBatch remembers who started it.
Search mode for MVP is one-time search.
```

---

## 7.2 truck_search_sessions

Represents search execution for one truck.

### Fields

```txt
id
search_batch_id
truck_id
owner_user_id
status
filters_snapshot
started_at
completed_at
timeout_at
error_message
created_at
updated_at
```

### Statuses

```txt
pending
running
completed
failed
timeout
cancelled
```

### Field Notes

```txt
id:
Primary key.

search_batch_id:
Foreign key to search_batches.id.

truck_id:
Foreign key to trucks.id.

owner_user_id:
Dispatcher who started/owns this truck search.

status:
Current truck-search status.

filters_snapshot:
JSON/text snapshot of search filters used.

started_at:
When this truck search started.

completed_at:
When this truck search finished.

timeout_at:
Time when search should stop if still running.

error_message:
Optional failure reason.

created_at / updated_at:
Standard timestamps.
```

### Relationships

```txt
SearchBatch -> many TruckSearchSessions
Truck -> many TruckSearchSessions
User -> many owned TruckSearchSessions
TruckSearchSession -> many LoadSnapshots
TruckSearchSession -> many DispatcherActions
TruckSearchSession -> many WorkerLogs
```

### Business Rules

```txt
Each TruckSearchSession belongs to one truck.
Each TruckSearchSession has one owner dispatcher.
Only the owner dispatcher can manipulate active search results.
Other company dispatchers can observe.
Each truck search should have timeout protection.
```

---

# 8. Load Result Tables

## 8.1 loads

Stores stable load identity.

This table should not store changing search-time details like current rate or mileage. Those belong in LoadSnapshot.

### Fields

```txt
id
deduplication_key
broker_name
equipment_type
origin
destination
created_at
updated_at
```

### Field Notes

```txt
id:
Primary key.

deduplication_key:
Used to identify duplicate loads.

broker_name:
Broker/company posting the load.

equipment_type:
Required equipment.

origin:
Pickup/origin location.

destination:
Delivery/destination location.

created_at / updated_at:
Standard timestamps.
```

### Relationships

```txt
Load -> many LoadSnapshots
Load -> many LoadSources
Load -> many DispatcherActions
Load -> optional BookedLoad
```

### Business Rules

```txt
Load represents stable identity.
Same load from multiple boards should not become multiple separate loads.
Deduplication should merge duplicates.
```

---

## 8.2 load_snapshots

Stores search-time data about a load.

### Fields

```txt
id
load_id
truck_search_session_id
posted_rate
mileage
rpm
weight
pickup_date
delivery_date
raw_details
created_at
```

### Field Notes

```txt
id:
Primary key.

load_id:
Foreign key to loads.id.

truck_search_session_id:
Foreign key to truck_search_sessions.id.

posted_rate:
Rate shown during this search.

mileage:
Mileage shown during this search.

rpm:
Rate per mile if calculated or available.

weight:
Load weight.

pickup_date:
Pickup date.

delivery_date:
Delivery date.

raw_details:
Raw parsed details from load board.

created_at:
When snapshot was saved.
```

### Relationships

```txt
Load -> many LoadSnapshots
TruckSearchSession -> many LoadSnapshots
LoadSnapshot -> optional ScoringResult
LoadSnapshot -> optional AIExplanation
```

### Business Rules

```txt
LoadSnapshot preserves what dispatcher saw during a search.
Same load can have many snapshots over time.
Changing details are stored here, not in Load.
```

---

## 8.3 load_sources

Stores where a load was found.

### Fields

```txt
id
load_id
load_board_name
external_load_id
source_url
raw_source_data
created_at
```

### Field Notes

```txt
id:
Primary key.

load_id:
Foreign key to loads.id.

load_board_name:
Source board name.

external_load_id:
Load-board-specific load identifier if available.

source_url:
Optional direct URL.

raw_source_data:
Raw data from source.

created_at:
When source was recorded.
```

### Relationships

```txt
Load -> many LoadSources
```

### Business Rules

```txt
Same load can have multiple LoadSources.
One load may be found on DAT and Truckstop.
System still counts it as one Load.
Source records preserve where the load came from.
```

---

# 9. Dispatcher Action Tables

## 9.1 dispatcher_actions

Stores dispatcher decisions on search results.

### Fields

```txt
id
user_id
truck_search_session_id
load_id
action_type
reason
notes
created_at
```

### Action Types

```txt
saved
rejected
favorited
contacted
```

### Field Notes

```txt
id:
Primary key.

user_id:
Foreign key to users.id.

truck_search_session_id:
Foreign key to truck_search_sessions.id.

load_id:
Foreign key to loads.id.

action_type:
Dispatcher action type.

reason:
Optional rejection/contact/save reason.

notes:
Optional dispatcher notes.

created_at:
When action was made.
```

### Relationships

```txt
User -> many DispatcherActions
TruckSearchSession -> many DispatcherActions
Load -> many DispatcherActions
```

### Business Rules

```txt
Dispatcher actions are stored historically.
Only owner dispatcher can manipulate active TruckSearchSession results.
Rejected loads should not disappear without record.
Contacted loads should be visible as already contacted.
Action history can later support analytics.
```

---

# 10. Booking Tables

## 10.1 booked_loads

Stores accepted/booked load history.

### Fields

```txt
id
company_id
load_id
truck_id
driver_id
dispatcher_user_id
posted_rate
final_negotiated_rate
mileage
rpm
status
pickup_date
delivery_date
created_at
updated_at
```

### Statuses

```txt
booked
picked_up
delivered
cancelled
```

### Field Notes

```txt
id:
Primary key.

company_id:
Foreign key to companies.id.

load_id:
Foreign key to loads.id.

truck_id:
Foreign key to trucks.id.

driver_id:
Foreign key to drivers.id.

dispatcher_user_id:
Dispatcher who booked the load.

posted_rate:
Original rate shown on board.

final_negotiated_rate:
Final agreed rate.

mileage:
Booked load mileage.

rpm:
Final rate per mile.

status:
Operational booking status.

pickup_date:
Pickup date.

delivery_date:
Delivery date.

created_at / updated_at:
Standard timestamps.
```

### Relationships

```txt
Company -> many BookedLoads
Load -> optional BookedLoad
Truck -> many BookedLoads
Driver -> many BookedLoads
User -> many BookedLoads as dispatcher
```

### Business Rules

```txt
Booked loads are stored historically.
Final negotiated rate is stored separately from posted rate.
Booked load connects to dispatcher, truck, and driver.
Booked loads should support operational statuses.
```

---

# 11. Scoring & AI Tables

## 11.1 scoring_preferences

Stores dispatcher-specific scoring preferences.

### Fields

```txt
id
user_id
company_id
rate_weight
rpm_weight
mileage_weight
origin_weight
destination_weight
broker_weight
driver_preference_weight
created_at
updated_at
```

### Field Notes

```txt
id:
Primary key.

user_id:
Foreign key to users.id.

company_id:
Foreign key to companies.id.

rate_weight:
Importance of total rate.

rpm_weight:
Importance of rate per mile.

mileage_weight:
Importance of mileage.

origin_weight:
Importance of origin area.

destination_weight:
Importance of destination area.

broker_weight:
Importance of broker quality.

driver_preference_weight:
Importance of driver preferences.

created_at / updated_at:
Standard timestamps.
```

### Relationships

```txt
User -> many ScoringPreferences
Company -> many ScoringPreferences
```

### Business Rules

```txt
Scoring preferences are per dispatcher.
Different dispatchers may prioritize different criteria.
Preferences can be adjusted later.
```

---

## 11.2 scoring_results

Stores rule-based score for a load snapshot.

### Fields

```txt
id
load_snapshot_id
score
score_breakdown
created_at
```

### Field Notes

```txt
id:
Primary key.

load_snapshot_id:
Foreign key to load_snapshots.id.

score:
Final numeric score.

score_breakdown:
JSON/text explaining score components.

created_at:
When scoring was calculated.
```

### Relationships

```txt
LoadSnapshot -> optional ScoringResult
```

### Business Rules

```txt
Rule-based scoring runs before AI explanations.
Scoring result should be explainable.
Score breakdown should be stored for transparency.
```

---

## 11.3 ai_explanations

Stores AI-generated explanations for top loads.

### Fields

```txt
id
load_snapshot_id
explanation_text
model_name
created_at
```

### Field Notes

```txt
id:
Primary key.

load_snapshot_id:
Foreign key to load_snapshots.id.

explanation_text:
Generated explanation.

model_name:
AI model used.

created_at:
When explanation was generated.
```

### Relationships

```txt
LoadSnapshot -> optional AIExplanation
```

### Business Rules

```txt
AI explanations should be generated only for top 5–10 loads.
AI explanations should be stored.
Explanations should not regenerate every time the page opens.
AI explains ranking after rule-based scoring.
```

---

# 12. Worker & Debug Tables

## 12.1 worker_logs

Stores search-worker progress and errors.

### Fields

```txt
id
truck_search_session_id
load_board_name
event_type
message
metadata
created_at
```

### Event Types

```txt
worker.started
browser.opened
session.loaded
load_board.connected
load_board.failed
loads.found
loads.parsed
deduplication.completed
scoring.started
scoring.completed
ai.started
ai.completed
worker.completed
worker.failed
```

### Field Notes

```txt
id:
Primary key.

truck_search_session_id:
Foreign key to truck_search_sessions.id.

load_board_name:
Related board name if event is board-specific.

event_type:
Worker event type.

message:
Human-readable log message.

metadata:
Optional JSON/debug data.

created_at:
When log event happened.
```

### Relationships

```txt
TruckSearchSession -> many WorkerLogs
```

### Business Rules

```txt
Worker logs are important for debugging.
Browser automation will fail sometimes.
Logs help explain what happened during search.
Logs help diagnose session and load-board problems.
```

---

# 13. Full Relationship Map

```txt
User
  -> CompanyMembership
    -> Company

Company
  -> CompanyMembership
  -> Truck
  -> Driver
  -> LoadBoardSession
  -> SearchBatch
  -> BookedLoad
  -> ScoringPreference

Truck
  -> current Driver
  -> TruckSearchSession
  -> BookedLoad

Driver
  -> Truck
  -> BookedLoad

SearchBatch
  -> TruckSearchSession

TruckSearchSession
  -> Truck
  -> Owner User
  -> LoadSnapshot
  -> DispatcherAction
  -> WorkerLog

Load
  -> LoadSnapshot
  -> LoadSource
  -> DispatcherAction
  -> BookedLoad

LoadSnapshot
  -> ScoringResult
  -> AIExplanation

BookedLoad
  -> Company
  -> Load
  -> Truck
  -> Driver
  -> Dispatcher User
```

---

# 14. Simplified ERD-Style View

```txt
users
  |
  | many-to-many through company_memberships
  v
companies
  |
  |-- trucks
  |-- drivers
  |-- load_board_sessions
  |-- search_batches
  |-- booked_loads
  |-- scoring_preferences

search_batches
  |
  v
truck_search_sessions
  |
  |-- load_snapshots
  |-- dispatcher_actions
  |-- worker_logs

loads
  |
  |-- load_snapshots
  |-- load_sources
  |-- dispatcher_actions
  |-- booked_loads

load_snapshots
  |
  |-- scoring_results
  |-- ai_explanations
```

---

# 15. Important Database Rules

```txt
A company can have many users.
A user can work in multiple companies.
Users access company data through CompanyMembership.
A company has many trucks.
A company has many drivers.
Drivers can change trucks.
Trucks store current driver display fields for quick UI access.
Drivers store full driver information and preferences.
Load-board sessions are company-level.
A SearchBatch has many TruckSearchSessions.
Each TruckSearchSession belongs to one truck.
Each TruckSearchSession has one owner dispatcher.
Only the owner dispatcher can manipulate active search results.
Other dispatchers can observe company-wide state.
Loads are deduplicated.
Same load found on multiple boards is one Load.
One Load can have many LoadSources.
LoadSnapshot stores changing search-time data.
Dispatcher actions are stored historically.
Booked loads are stored historically.
Final negotiated rate is separate from posted rate.
Rule-based scoring is stored before AI explanation.
AI explanations are generated only for top loads.
Worker logs are stored for debugging.
Raw parsed data can be temporary and deleted after search/truck work is finished.
```

---

# 16. MVP Database Build Order

```txt
1. users
2. companies
3. company_memberships
4. trucks
5. drivers
6. load_board_sessions
7. search_batches
8. truck_search_sessions
9. loads
10. load_snapshots
11. load_sources
12. dispatcher_actions
13. booked_loads
14. scoring_preferences
15. scoring_results
16. ai_explanations
17. worker_logs
```

---

# 17. Notes for Implementation

Recommended database:

```txt
PostgreSQL
```

Recommended ORM:

```txt
SQLAlchemy
```

Recommended migration tool:

```txt
Alembic
```

Recommended ID style:

```txt
UUID primary keys
```

Recommended timestamp fields:

```txt
created_at
updated_at
```

Recommended flexible fields:

```txt
JSONB for:
- profile_info
- preferences
- filters_snapshot
- raw_details
- raw_source_data
- score_breakdown
- metadata
```

Important MVP advice:

```txt
Start with tables and relationships first.
Do not over-optimize the schema before building.
Add advanced constraints after the core flow works.
Build with mock loads first.
Real browser automation should come later.
```
