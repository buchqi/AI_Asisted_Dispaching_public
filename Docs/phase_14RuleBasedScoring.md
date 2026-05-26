# Phase 14 — Rule-Based Scoring

## Goal

Phase 14 introduces the first ranking system for load results.

Before this phase, the platform could:

- search loads
- store load results
- track dispatcher actions
- create bookings

But every load was displayed equally.

The system had no way to determine:

```text
Which load is better?
Which load should appear first?
Which load matches dispatcher preferences?
Which load is most profitable?
```

Phase 14 solves this by introducing a configurable rule-based scoring engine.

---

# Why This Phase Exists

A dispatcher may receive:

```text
50 loads
100 loads
200 loads
```

from a search.

Reviewing every load manually is slow.

Instead, the system should automatically rank loads based on:

```text
Rate
Rate per mile
Mileage
Origin
Destination
Broker
Driver preferences
```

The goal is to surface the most relevant loads first.

---

# What Was Added

Phase 14 introduces:

```text
ScoringPreference
ScoringResult
ScoringService
Rule-based scoring engine
Score breakdown storage
Dispatcher-specific scoring preferences
```

---

# Core Philosophy

This is NOT AI yet.

Phase 14 uses:

```text
deterministic rules
```

instead of:

```text
machine learning
LLMs
AI reasoning
```

Example:

```text
Higher RPM
        ↓
Higher score

Preferred destination
        ↓
Higher score

Avoided broker
        ↓
Lower score
```

The scoring logic is fully explainable.

---

# ScoringPreference Model

File:

```text
app/models/scoring_preference.py
```

---

## Purpose

Stores scoring preferences for a dispatcher.

Different dispatchers may prefer:

```text
Different lanes
Different brokers
Different mileage ranges
Different RPM targets
```

Therefore preferences are:

```text
Per Dispatcher
Not Per Company
```

---

# Why Per Dispatcher?

Example:

Dispatcher A:

```text
Prefers Texas
Prefers short runs
```

Dispatcher B:

```text
Prefers Florida
Prefers long-haul loads
```

Same company.

Different priorities.

Therefore:

```text
User → Own Scoring Preferences
```

---

# Main Preference Fields

Weight fields:

```text
rate_weight
rpm_weight
mileage_weight
origin_weight
destination_weight
broker_weight
driver_preference_weight
```

Preference filters:

```text
preferred_origin_states
preferred_destination_states
preferred_brokers
avoided_brokers
max_miles
min_rate
min_rate_per_mile
```

---

# Example Preference Configuration

```json
{
  "min_rate": 2000,
  "min_rate_per_mile": 2.5,
  "preferred_destination_states": ["TX", "FL"],
  "preferred_brokers": ["TQL"],
  "max_miles": 900
}
```

Meaning:

```text
Prefer Texas and Florida
Prefer TQL
Prefer loads above $2000
Prefer RPM above 2.5
Prefer loads under 900 miles
```

---

# ScoringResult Model

File:

```text
app/models/scoring_result.py
```

---

## Purpose

Stores calculated score for a specific LoadSnapshot.

A score belongs to:

```text
Dispatcher
+
LoadSnapshot
```

because different dispatchers may score the same load differently.

---

# Main Fields

```text
company_id
dispatcher_user_id
load_snapshot_id
load_id
truck_search_session_id
score
breakdown
```

---

# Score

Example:

```text
86.5
```

Higher score means:

```text
More attractive load
```

according to current dispatcher preferences.

---

# Breakdown

Stores explanation of score calculation.

Example:

```json
{
  "posted_rate": {
    "points": 20
  },
  "rpm": {
    "points": 25
  },
  "destination": {
    "points": 10
  }
}
```

This makes scoring transparent.

Dispatcher can see:

```text
WHY
```

the load received its score.

---

# Scoring Engine

File:

```text
app/services/scoring_service.py
```

---

## Purpose

Calculate scores.

Store results.

Return rankings.

---

# Scoring Factors

Phase 14 evaluates:

```text
Posted Rate
Rate Per Mile
Mileage
Origin
Destination
Broker
Driver Preferences
```

---

# Posted Rate

Higher rate increases score.

Example:

```text
Load A = $2500
Load B = $1500
```

Result:

```text
Load A receives more points
```

---

# Rate Per Mile (RPM)

Formula:

```text
RPM = Rate / Miles
```

Example:

```text
$2500 / 1000 miles
RPM = 2.50
```

Higher RPM generally means:

```text
Better profitability
```

Therefore:

```text
Higher RPM
=
Higher Score
```

---

# Mileage

Dispatcher may prefer:

```text
Short runs
```

Example:

```text
max_miles = 900
```

Load:

```text
750 miles
```

Receives positive points.

Load:

```text
1300 miles
```

Receives reduced score.

---

# Origin Preference

Dispatcher may prefer:

```text
Georgia
Florida
```

Example:

```json
["GA", "FL"]
```

Load originating in Georgia:

```text
Bonus points
```

---

# Destination Preference

Dispatcher may prefer:

```text
Texas
Florida
```

Load ending there:

```text
Bonus points
```

---

# Broker Preference

Preferred brokers:

```text
Extra points
```

Avoided brokers:

```text
Negative points
```

Example:

```json
{
  "preferred_brokers": ["TQL"],
  "avoided_brokers": ["Bad Broker LLC"]
}
```

---

# Driver Preference

Currently simplified.

Phase 14 does not implement advanced driver preference scoring.

Placeholder breakdown may appear:

```json
{
  "driver_preferences": {
    "points": 0,
    "reason": "Not implemented yet"
  }
}
```

This prepares architecture for future improvements.

---

# Score Calculation Flow

Example:

```text
LoadSnapshot
        ↓
Load
        ↓
Load Dispatcher Preferences
        ↓
Calculate Factors
        ↓
Generate Breakdown
        ↓
Calculate Total Score
        ↓
Store ScoringResult
        ↓
Return Score
```

---

# Default Preferences

If dispatcher has no preferences:

System automatically creates:

```text
Default Scoring Preferences
```

with sensible values.

This prevents:

```text
Empty configuration
Errors
Missing score calculations
```

---

# New Endpoints

---

## GET `/companies/{company_id}/scoring-preferences/me`

### Purpose

Get current dispatcher scoring preferences.

---

### Behavior

If preferences do not exist:

```text
Create defaults
Return defaults
```

---

### Flow

```text
Validate company membership
        ↓
Find preferences
        ↓
Create if missing
        ↓
Return preferences
```

---

# PATCH `/companies/{company_id}/scoring-preferences/me`

### Purpose

Update scoring preferences.

---

### Example Request

```json
{
  "min_rate": 2000,
  "preferred_destination_states": ["TX", "FL"],
  "rpm_weight": 2.0
}
```

---

### Flow

```text
Validate membership
        ↓
Create defaults if missing
        ↓
Update provided fields
        ↓
Save
        ↓
Return updated preferences
```

---

# GET `/load-snapshots/{load_snapshot_id}/score`

### Purpose

Return score for one load snapshot.

---

### Behavior

If score exists:

```text
Return existing score
```

If score does not exist:

```text
Calculate score
Store score
Return score
```

---

### Flow

```text
Load Snapshot
        ↓
Load Preferences
        ↓
Calculate Score
        ↓
Store ScoringResult
        ↓
Return Result
```

---

# Why Scores Are Stored

Instead of recalculating every request:

```text
Calculate Once
Store Result
Reuse Result
```

Benefits:

```text
Faster API
Historical record
Future analytics
```

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
Track dispatcher decisions
```

---

## Phase 13

Created:

```text
BookedLoad
```

Purpose:

```text
Store booking history
```

---

## Phase 14

Created:

```text
ScoringPreference
ScoringResult
```

Purpose:

```text
Rank loads automatically
```

---

# Current Search Workflow

After Phase 14:

```text
Dispatcher starts search
        ↓
Worker finds loads
        ↓
Loads stored
        ↓
LoadSnapshots stored
        ↓
Scoring engine runs
        ↓
Scores calculated
        ↓
ScoringResults stored
        ↓
Loads ranked
        ↓
Dispatcher reviews best loads first
```

---

# Database Relationships

```text
Dispatcher
        ↓
ScoringPreference
```

and:

```text
Dispatcher
        ↓
ScoringResult
        ↓
LoadSnapshot
        ↓
Load
```

---

# Why This Matters

Without scoring:

```text
100 loads
100 manual reviews
```

With scoring:

```text
100 loads
Top 10 shown first
```

This significantly reduces dispatcher workload.

---

# Future Evolution

Phase 14 is intentionally simple.

Future phases may add:

```text
Machine learning
AI recommendations
Historical performance analysis
Driver behavior patterns
Broker reputation scoring
Profitability predictions
Lane optimization
```

Those systems will build on:

```text
ScoringPreference
ScoringResult
```

introduced here.

---

# What Is Still Missing

Phase 14 does not include:

```text
AI explanations
LLM reasoning
Machine learning
Dynamic broker reputation
Advanced driver preference scoring
Predictive analytics
```

These will be added later.

---

# Done Criteria

Phase 14 is complete when:

```text
Dispatcher has scoring preferences
Default preferences are auto-created
Preferences can be updated
LoadSnapshots receive numeric scores
Score breakdown is stored
Scores are persisted in database
Scores can be retrieved through API
Dispatcher preferences influence ranking
Load results can be ranked by score
```

This phase introduces the first intelligence layer of the platform and creates the foundation for future AI-assisted load recommendations.
