# Frontend Structure

This document describes the frontend folder ownership after the routing and component refactor.

## Top-Level Folders

### `app/`

Owns Next.js route files only.

- Route folders live here.
- `page.tsx` files should stay small.
- `page.tsx` files should import feature-level components or route gates.
- Do not put reusable UI, domain workflows, API calls, or business logic here.

Current route examples:

- `app/page.tsx`
- `app/dispatch/page.tsx`
- `app/loads/page.tsx`
- `app/search/page.tsx`
- `app/companies/page.tsx`
- `app/companies/brokers/page.tsx`
- `app/trucks/page.tsx`
- `app/drivers/page.tsx`
- `app/settings/page.tsx`

### `components/`

Owns reusable, domain-free UI and layout components.

- `components/ui/` contains reusable pure UI primitives and visual helpers.
- `components/layout/` contains the app shell, sidebar, topbar/header, toast viewport, and layout-level modals.
- No business workflows, domain-specific forms, API calls, or backend data mapping should live here.

### `features/`

Owns business/domain-specific UI and logic.

Each feature folder owns components and logic for one domain:

- `features/auth/`
- `features/companies/`
- `features/trucks/`
- `features/drivers/`
- `features/search/`
- `features/loads/`
- `features/dispatch/`
- `features/settings/`

Feature components can use `components/ui`, `components/layout`, `api`, `store`, and `types`, but reusable UI should be extracted back to `components/ui` when it is no longer domain-specific.

### `api/`

Owns backend request functions and mock backend adapters.

Expected API modules include:

- `apiClient`
- `authApi`
- `companiesApi`
- `trucksApi`
- `driversApi`
- `searchApi`

Components and feature components should not call `fetch` directly. Put backend calls, request shaping, response mapping, and mock backend replacements in `api/`, then import the API function from the feature that needs it.

### `store/`

Owns global frontend state only.

Use it for state that must be shared across routes or unrelated feature areas, such as:

- auth/session/current user
- active company
- global workspace state
- cross-page notifications
- selected global navigation state

Avoid storing temporary form state globally. Form drafts, open/closed local panels, search input text scoped to one component, and validation errors should usually stay inside the feature component that owns them.

### `types/`

Owns shared TypeScript contracts and domain types.

Put types here when they are reused by multiple folders, shared between `api/` and `features/`, or represent backend/frontend contracts.

Examples:

- load contracts
- auth user/session types
- truck/driver/company records
- search result contracts
- workspace/domain workflow types

### Removed Legacy Folders

These folders no longer exist after the refactor:

- `services/`
- `entities/`
- `shared/`
- `websocket/`

Do not recreate them. Use `api/`, `types/`, `store/`, `components/`, and `features/` instead.

## Routing Rule

`app/` contains route files only.

Keep route files thin:

```tsx
import { AuthGate } from "@/features/auth/auth-gate";

export default function TrucksPage() {
  return <AuthGate initialPage="trucks" />;
}
```

A `page.tsx` file should:

- define the route entry point
- import feature components or route gates
- pass simple route-level props when needed

A `page.tsx` file should not:

- define large UI sections
- contain business workflows
- call backend APIs directly
- define domain types
- own reusable components

## Components Rule

### `components/ui`

Use this for reusable pure UI.

Examples:

- `Button`
- `Badge`
- `IconButton`
- `Panel`
- visual utility helpers

UI components should be generic and reusable across features. They should not know about trucks, companies, loads, dispatch, auth, or backend data.

### `components/layout`

Use this for app-level layout and chrome.

Examples:

- app shell
- sidebar
- topbar/header
- global toast viewport
- layout-level notification modal

Layout components can coordinate navigation and global presentation, but they should avoid owning domain workflows.

## Features Rule

Feature folders own domain-specific components and logic.

Examples:

- `features/auth/` owns login, registration, session gate, and auth-specific UI.
- `features/companies/` owns company and broker domain screens.
- `features/trucks/` owns truck and trailer domain screens.
- `features/drivers/` owns driver domain screens.
- `features/search/` owns search center and search session UI.
- `features/loads/` owns load tables, load filters, and load intelligence UI.
- `features/dispatch/` owns dispatch workspace, assignments, analytics, notifications, and operational screens.
- `features/settings/` owns settings screens and settings-specific UI.

If a component is only meaningful inside one domain, put it in that feature folder. If it becomes reusable across domains, move the reusable visual part to `components/ui`.

## API Layer Rule

The API layer is the only place that should know how backend requests are made.

Use API modules such as:

- `apiClient`
- `authApi`
- `companiesApi`
- `trucksApi`
- `driversApi`
- `searchApi`

Feature components should call API functions, not `fetch` directly.

Good:

```ts
import { trucksApi } from "@/api/trucks-api";

const trucks = await trucksApi.list();
```

Avoid:

```ts
const trucks = await fetch("/api/trucks").then((response) => response.json());
```

This keeps backend changes isolated to `api/`.

## Examples

### Route imports a feature component

If `features/trucks/truck-list.tsx` exists, `app/trucks/page.tsx` should stay small:

```tsx
import { TruckList } from "@/features/trucks/truck-list";

export default function TrucksPage() {
  return <TruckList />;
}
```

If the route requires auth/session gating, keep that gate in the route and let the feature own the domain UI.

### New reusable Button

Place a reusable button in:

```txt
components/ui/button.tsx
```

Use this when the button is generic and can be used by trucks, drivers, loads, companies, and settings.

### New CreateTruckForm

Place a truck-specific form in:

```txt
features/trucks/create-truck-form.tsx
```

The form belongs to the trucks domain because it knows truck fields, validation, and truck workflows.

### New backend function

Place a new backend request function in:

```txt
api/trucks-api.ts
```

or create a focused API module if the domain grows:

```txt
api/truck-documents-api.ts
```

Then import that function from `features/trucks/`.

## Do / Don't

### Do

- Do keep `app/**/page.tsx` files small.
- Do put route ownership in `app/`.
- Do put reusable visual primitives in `components/ui`.
- Do put shell/sidebar/header/layout components in `components/layout`.
- Do put domain-specific workflows in `features/{domain}`.
- Do put backend request functions in `api/`.
- Do put shared TypeScript contracts in `types/`.
- Do keep temporary form state local when only one component needs it.
- Do move a component to `components/ui` only when it is genuinely reusable.

### Don't

- Don't put route pages inside `components/`.
- Don't put business logic in `components/ui`.
- Don't call `fetch` directly from components.
- Don't store every form draft or modal input in the global store.
- Don't recreate `services/`, `entities/`, `shared/`, or `websocket/`.
- Don't make `page.tsx` files responsible for complex UI or domain workflows.
- Don't mix unrelated domains in one feature folder unless it is intentional app-level dispatch behavior.
