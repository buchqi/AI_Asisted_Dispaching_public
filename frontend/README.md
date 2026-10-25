# Veliora frontend / Freight Command Center

Next.js App Router, React, TypeScript, Tailwind CSS, Zustand, TanStack libraries,
Framer Motion, and Lucide. Auth, company/member management, fleet profiles,
truck searches, ranked results, dispatcher actions, and the saved/contacted work
queue call the FastAPI backend. Search results still originate from backend mock
workers. Many operational screens and controls remain empty or inactive.

See [PROJECT_STATE.md](../Docs/PROJECT_STATE.md) for the feature matrix, evidence,
known defects, and validation limits. See [the backend README](../Backend/README.md)
for server/database setup.

## Run and validate

Run from `frontend/` with Node.js and npm:

```powershell
npm ci
$env:NEXT_PUBLIC_API_BASE_URL = 'http://localhost:8000'
npm run dev
```

Open `http://localhost:3000`. The API URL defaults to `http://localhost:8000` when
unset. For builds, set it before `npm run build`; it is public client configuration,
never a place for secrets. The review used Node 24.14.0 and npm 10.8.1; no supported
Node version is declared. Backend CORS allows local ports 3000 and 3001, not 3002.

```powershell
npm run lint
npm run typecheck
npm run build
npm start
```

Lint, typecheck, and production build passed during the review. There is no
frontend automated test script. A successful build does not verify browser flows.

## Folder ownership and development conventions

| Folder | Responsibility |
| --- | --- |
| `app/` | Thin route entries, layout, providers, and global styles. |
| `components/ui/` | Reusable visual primitives and helpers. |
| `components/layout/` | Sidebar, topbar, shell, toasts, layout modals. |
| `features/` | Domain UI, forms, local workflow state, API coordination. Much fleet/operational UI still lives in `features/dispatch/operational-screens.tsx`. |
| `api/` | Request shaping, response handling, and explicitly marked stubs. |
| `store/` | Shared auth, company, and workspace state. Keep temporary form drafts local. |
| `types/` | Shared frontend contracts; align these with backend schemas. |

Keep route pages small, business workflows in their feature, and generic visuals
in `components/`. Call domain API functions from features; keep `fetch`, bearer
headers, form/JSON encoding, and `ApiError` handling in `api/api-client.ts`.
Do not recreate the retired `services/`, `entities/`, `shared/`, or `websocket/`
folder structure. Clearly label any temporary mocks. Update these docs with
verified behavior when contracts change.

## Current API and state conventions

- Login uses URL-encoded `username` (email) and `password`; registration uses JSON.
  The backend returns the access token and user. `GET /auth/me` restores identity.
- `api-client.ts` stores the bearer token under `freight-command-access-token` in
  localStorage. `company-store.ts` stores `freight-command-active-company-id` and
  resolves it against accessible companies. Company-scoped requests need that ID.
- Use database truck `id` in paths and `truck_ids`; use the string `truck_id` only
  as the human-facing unit number. Null migrated profile fields need fallbacks.
- `POST /searches/start` takes `company_id`, `truck_ids`, optional `overrides`, and
  `timeout_seconds`. The backend merges truck defaults; do not send the retired
  `filters` payload. Current overrides are not enforced as real search constraints.
- Search progress polls every four seconds while sessions are pending/running.
  The frontend does not subscribe to backend WebSockets. Recent batch IDs are kept
  under `freight-command-search-batch-ids` (up to 12); there is no server history
  discovery endpoint. That storage is not partitioned by user/company.
- `GET /truck-search-sessions/{id}/scores` returns nested load details, breakdowns,
  and action state. `/score` is the separate, simpler scoring response.
- Save, reject, favorite, contacted, and clear-action requests append history.
  Only one action is currently active per session/load. Clicking the selected
  action appends `cleared`. Backend ownership checks apply even after completion.
- Live Loads fetches `/companies/{id}/dispatcher-action-loads` for the current
  dispatcher's latest saved/contacted results. Favorite/rejected/cleared results
  are excluded. This screen is not a booked-load list.
- Booking and AI-explanation APIs exist in the backend but have no frontend API
  adapter or completed user flow. Assignments, broker profiles, notifications,
  settings persistence, and global search remain incomplete; several API methods
  return empty collections and workspace actions are no-ops.

When debugging, check CORS origin/port, exact FastAPI payload schema (`422`), applied
migrations, DB IDs versus display labels, and locally retained batch IDs. Clearing a
final session soft-hides it in the backend; new searches do not automatically hide
previous final sessions. There is no automatic token refresh or server logout.

The folder rules, API boundary guidance, and current integration notes formerly
spread across `docs/`, `api/README.md`, and `components/README.md` are consolidated
here. [ANALYSIS.md](ANALYSIS.md) is a historical prototype inventory with unapproved
future contracts; do not treat it as the current implementation.
