# Services Structure

This folder is the backend-ready boundary for beta-2.

Each business domain has its own service folder:

- `services/auth`
- `services/loads`
- `services/drivers`
- `services/trucks`
- `services/brokers`
- `services/assignments`
- `services/search`
- `services/notifications`
- `services/analytics`
- `services/companies`
- `services/storage`

The current service files still use mock/localStorage data where needed.
When the backend is ready, replace service internals with real API calls and keep UI components calling the same service boundary.

Preferred integration shape:

```txt
components/<domain> -> services/<domain> -> backend /api/<domain>
```
