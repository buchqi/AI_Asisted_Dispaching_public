# Phase 15 Progress Report — AI Explanations

**Date:** 2026-05-26

---

# Objective

Implement AI-generated explanations for top-ranked loads while ensuring that dispatcher workflows remain fast, reliable, and independent from AI failures.

---

# Original Architecture

Initially AI explanation generation was coupled directly with scoring:

```text
Search Results
      ↓
Rule-Based Scoring
      ↓
GET /truck-search-sessions/{id}/score
      ↓
Generate AI Explanations
```

## Problems

- Increased latency for score endpoint
- Gemini failures impacted dispatcher workflow
- Rate limits affected score retrieval
- AI became a dependency for viewing ranked loads
- Poor user experience during provider outages

---

# Architecture Refactor

AI generation was separated completely from rule-based scoring.

## New Architecture

```text
Search Results
      ↓
Rule-Based Scoring
      ↓
GET /truck-search-sessions/{id}/score
      ↓
Return immediately

Dispatcher starts reviewing loads

      ↓

POST /truck-search-sessions/{id}/ai-explanations
      ↓
Generate AI explanations for top-ranked loads
      ↓
Store explanations

      ↓

GET /truck-search-sessions/{id}/ai-explanations
      ↓
Return stored explanations
```

---

# Scoring Endpoint Changes

## Endpoint

```http
GET /truck-search-sessions/{id}/score
```

## Final Behavior

- Returns scored loads only
- Sorted by score descending
- No Gemini calls
- No AI generation
- No AI database reads
- Low latency
- Independent from AI provider failures

### Example Response

```json
{
  "id": 12,
  "load_snapshot_id": 62,
  "score": 145.5,
  "breakdown": {}
}
```

### Removed Fields

```json
{
  "explanation_text": "...",
  "ai_explanation": {}
}
```

AI-related fields were completely removed from score responses.

---

# New AI Endpoints

## Generate Explanations

### Endpoint

```http
POST /truck-search-sessions/{id}/ai-explanations
```

### Responsibilities

- Load scored results
- Sort by score descending
- Select top N loads
- Generate AI explanations
- Store successful explanations
- Reuse existing explanations when applicable

### Supported Parameters

```http
?limit=1
?limit=5
?limit=10
?limit=20
```

### Current Testing

```http
POST /truck-search-sessions/16/ai-explanations?limit=1
```

---

## Retrieve Explanations

### Endpoint

```http
GET /truck-search-sessions/{id}/ai-explanations
```

### Responsibilities

- Return stored explanations
- No Gemini calls
- No regeneration
- Fast database lookup only

---

# Database

## Table

```text
ai_explanations
```

### Fields

```text
id
company_id
dispatcher_user_id
load_id
load_snapshot_id
scoring_result_id
truck_search_session_id
provider
model_name
explanation_text
prompt_version
input_hash
created_at
```

---

# Explanation Reuse Strategy

Explanations are tied to a specific snapshot of a load.

## Reason

Loads change over time:

```text
Load
 ↓
Snapshot #1
Rate = 2500
Score = 84

 ↓

Snapshot #2
Rate = 2800
Score = 92
```

Same load.

Different snapshot.

Different score.

Different explanation.

### Reuse Conditions

Explanation may be reused only when:

```text
Same load_snapshot_id
Same score
Same breakdown
Same prompt version
```

---

# Prompt Refactor

Prompt logic was extracted from the service layer.

## New File

```text
app/services/prompts/ai_explanation_prompts.py
```

Contains:

```python
PROMPT_VERSION
build_explanation_prompt()
```

### Benefits

- Easier prompt iteration
- Cleaner service layer
- Prompt versioning support
- Better maintainability

---

# Gemini Integration

## Provider

```text
Google Gemini
```

## Model

```text
gemini-3-flash-preview
```

## Configuration

Environment variables:

```env
GEMINI_API_KEY=
```

Stored in:

```text
.env
.env.example
```

No API keys are hardcoded.

---

# Problems Encountered

## 1. Missing Database Migration

### Error

```text
relation "ai_explanations" does not exist
```

### Cause

Migration created but never applied.

### Fix

```bash
alembic upgrade head
```

---

## 2. Invalid API Keys

### Errors

```text
API Key not found
```

```text
Your API key was reported as leaked
```

### Actions Taken

- Revoked compromised key
- Generated new key
- Updated environment configuration

---

## 3. Gemini Rate Limits

### Error

```text
429 RESOURCE_EXHAUSTED
```

### Temporary Solution

Use:

```http
?limit=1
```

during testing.

---

## 4. Service Unavailable

### Error

```text
503 UNAVAILABLE
```

### Result

AI generation failed.

Scoring continued functioning normally.

Architecture proved resilient.

---

## 5. Request Timeouts

### Error

```text
TimeoutError
```

### Result

- AI generation failed
- API still returned HTTP 200
- Dispatcher workflow remained unaffected

---

# AI Validation Layer

To prevent storing broken AI responses, validation was added.

## Invalid Examples

```text
This load from
```

```text
This Savannah to Orlando run
```

```text
This load from Savannah to Orlando offers a
```

### Validation Rules

- Response cannot be empty
- Response must meet minimum length requirements
- Response must end with sentence punctuation
- Response must be complete

Incomplete responses are skipped and never stored.

---

# Gemini Output Investigation

Observed responses:

```text
This load from
```

```text
This Savannah to Orlando run
```

```text
This load from Savannah to Orlando offers a
```

Inspection revealed:

```json
"finishReason": "MAX_TOKENS"
```

Meaning Gemini stopped generation before completing the answer.

### Potential Causes

- Output token limit too small
- Preview model instability
- Internal reasoning consuming output budget
- Provider-side generation issues

Investigation remains unfinished.

---

# Important Product Decision

AI explanations are considered:

```text
Helpful Enhancement
```

NOT:

```text
Core Dispatcher Functionality
```

Dispatchers must always be able to:

- Search loads
- View rankings
- Analyze loads manually
- Book freight

Even when:

```text
Gemini fails
Gemini times out
Gemini rate limits
Gemini is unavailable
```

---

# Current Status

## Completed

- AI explanation table
- AI explanation service
- Gemini integration
- Prompt extraction
- Prompt versioning
- Explanation reuse logic
- Dedicated AI endpoints
- Scoring endpoint isolation
- Graceful AI failure handling
- Incomplete response validation
- Environment-based API configuration

---

## Remaining Work

### AI Reliability

- Retry strategy
- Exponential backoff
- Better timeout handling
- Better Gemini parsing
- Complete response validation improvements
- Alternative Gemini model testing

### Future Multi-Provider Architecture

Planned provider router:

```text
Provider Router
├── Gemini
├── OpenAI
├── Claude
├── DeepSeek
└── OpenRouter
```

### Future Usage

```text
Load reasoning
    → cheap fast model

Negotiation assistance
    → stronger model

Email drafting
    → cheapest model
```

---

# Recommended Next Session

1. Verify Gemini response parsing implementation
2. Review generation configuration
3. Fix truncated responses
4. Successfully generate one complete explanation
5. Test limits:
   - limit=1
   - limit=5
   - limit=10
6. Implement retry/backoff logic
7. Finalize Phase 15 implementation

---

# Final Outcome

Phase 15 architecture has been successfully separated from scoring.

The system now guarantees:

- Fast score retrieval
- Independent AI generation
- Failure isolation
- Explanation persistence
- Future provider flexibility

Remaining work is focused on AI provider reliability rather than application architecture.
