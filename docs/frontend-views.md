# Native declarative views (`frontend.views[]`)

The extension returns only DATA; the dashboard renders tables/forms natively from
`frontend.views[]`. No extension JS runs in the dashboard. Data/actions are
proxied through the tenant-facing gateway (`POST /v1/extensions/:slug/invoke`),
which enforces activation + permission + secret injection + SSRF guard.

## List view

```jsonc
{
  "key": "servers",
  "title": "Sunucular",
  "permission": "hosting_control.servers.view",   // gates tab + gateway access
  "data": { "method": "GET", "path": "api/extensions/.../servers", "itemsKey": "items" },
  "columns": [ { "key": "name", "label": "Ad", "type": "text" }, ... ],
  "actions": [ ... ],
  "detail": { ... }                                // optional drill-down (below)
}
```

- `data.path` is **gateway-relative** (no leading slash). The backend returns
  `{ items: [...] }` (use `itemsKey`) **or** a plain array (omit `itemsKey`).
- `columns[].type`: `text | number | boolean | date | badge`.
- `actions[].scope`: `collection` (top button; renders a form if `fields` present)
  or `row` (per-row button; `{id}` is filled from the row's id — see `idKey`).
- `actions[].fields[]`: `{ name, label, required?, type?, secret? }`. `secret: true`
  → masked input; the value is sent in the request body but never displayed back.
- `actions[].danger` + `confirm` → confirmation dialog before invoking.
- `actions[].permission` (optional) → gate a specific action separately from the
  view (e.g. view = `*.view`, create/delete = `*.manage`).

## Drill-down detail (`view.detail`)

When a row is opened, render `detail.sections[]` (tabs or accordions).

```jsonc
"detail": {
  "title": "Hesap detayı",
  "idKey": "id",            // which column of the parent row provides {id}
  "sections": [
    {
      "key": "metrics",
      "type": "fields",      // data returns a SINGLE object → key/value list
      "permission": "hosting_control.metrics.view",
      "data": { "method": "GET", "path": "api/extensions/.../accounts/{id}/metrics" },
      "fields": [ { "key": "diskUsedMb", "label": "Disk (MB)", "type": "number" }, ... ]
    },
    {
      "key": "emails",
      "type": "table",       // data returns an ARRAY (or itemsKey-wrapped) → table
      "permission": "hosting_control.email.view",
      "data": { "method": "GET", "path": "api/extensions/.../accounts/{id}/email-accounts" },
      "columns": [ ... ],
      "actions": [
        { "scope": "collection", "fields": [...], "permission": "...email.manage" },
        { "scope": "row", "rowKey": "email", "method": "DELETE",
          "path": ".../accounts/{id}/email-accounts/{rowId}", "danger": true, ... }
      ]
    }
  ]
}
```

### Placeholder substitution (renderer rules)
- `{id}` → the opened parent row's value at `detail.idKey` (default `id`).
- `{rowId}` → the current sub-row's value at the action's `rowKey` (URL-encode it).
- Query strings are allowed in `path` (e.g. database delete uses
  `.../databases/{rowId}?confirm=true`).

### Section types
- `type: "fields"` → `data` returns one object; render `fields[]` as key/value.
- `type: "table"` → `data` returns an array (or `itemsKey` wrapper); render
  `columns[]` + `actions[]`. An array-valued column (e.g. database `users`) should
  be joined for display.

## Backend response shapes (this extension)

| Endpoint | Shape | View config |
|---|---|---|
| `GET /servers` | `{ items: ServerDto[] }` | `itemsKey: "items"` |
| `GET /accounts` | `{ items: AccountDto[] }` | `itemsKey: "items"` |
| `GET /accounts/{id}/metrics` | `AccountMetricsDto` (object) | section `type: "fields"` |
| `GET /accounts/{id}/email-accounts` | `EmailAccountDto[]` | array, no `itemsKey` |
| `GET /accounts/{id}/domains` | `DomainDto[]` | array, no `itemsKey` |
| `GET /accounts/{id}/databases` | `{ databases: [...], users: [...] }` | `itemsKey: "databases"` |

## Security
- `permission` on a view/section/action gates BOTH dashboard visibility AND
  gateway access. The backend ALSO re-checks the route's own permission, so it is
  double-gated. The gateway must forward the user's permissions (`x-ext-permissions`)
  so the backend's `requirePermission` sees them.
- Mutating actions write audit rows; passwords/tokens are write-only (never returned).
