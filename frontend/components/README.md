# Components Structure

This beta-2 build keeps active React UI under `components/`, grouped by business domain.

- `components/auth` contains login/register/session gate UI.
- `components/loads` contains load table, filters, Live Loads entry point, and load intelligence UI.
- `components/drivers` contains the Drivers page entry point.
- `components/trucks` contains the Trucks / Trailers page entry point.
- `components/brokers` contains Broker Intelligence page entry point.
- `components/assignments` contains assignment board entry point.
- `components/search` contains Search Center and search session UI.
- `components/notifications` contains notification/activity UI.
- `components/analytics` contains analytics page entry point.
- `components/companies` contains companies page entry point.
- `components/settings` contains settings page entry point.
- `components/layout` contains app chrome: sidebar, topbar, shell, toast viewport.
- `components/ui` contains small reusable primitives.
- `components/operations` contains the temporary legacy backing module used while large pages are being extracted into smaller files.

Backend-facing data access should not be placed directly inside UI components.
Use `services/` for API-ready boundaries.
