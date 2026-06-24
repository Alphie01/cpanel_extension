# Configuration

## Environment variables
| Variable | Required | Secret | Default | Notes |
|---|---|---|---|---|
| `DATABASE_URL` | ✅ | ✅ | — | Tenant-scoped Prisma datasource. |
| `EXT_HOSTING_ENCRYPTION_KEY` | ✅ | ✅ | — | Base64, decodes to exactly 32 bytes. Boot fails otherwise. |
| `EXT_HOSTING_TENANT_CONTEXT_MODE` | — | — | `authenticated` | `authenticated` or `header`. |
| `EXT_PLATFORM_JWT_SECRET` | header mode only | ✅ | — | Verifies `x-ext-token` HMAC. |
| `EXT_HOSTING_WHM_TIMEOUT_MS` | — | — | `15000` | WHM HTTP timeout (ms). |
| `EXT_HOSTING_WHM_VERIFY_SSL` | — | — | `true` | Default SSL verification for new servers. |
| `PORT` | — | — | `11000` | Standalone/dev server port. |

## Generating the encryption key
```bash
openssl rand -base64 32
```
Store as the secret `EXT_HOSTING_ENCRYPTION_KEY`. Rotating the key: provision a new key under a new `keyId`, re-encrypt existing rows, and update `keyId` per row (the schema carries a `keyId` column on every encrypted row for exactly this).

## Runtime models

### In-process (host mounts the router)
The host imports `createRouter()` and mounts it. Build the container once with `createContainer()` (requires `DATABASE_URL` + `EXT_HOSTING_ENCRYPTION_KEY` at boot) and pass a static deps factory:
```ts
const c = createContainer();
app.use(API_PREFIX, createRouter({ contextProvider: c.contextProvider, depsFactory: () => c, logger: c.logger }));
```

### Out-of-process (container, echo contract)
The platform builds/runs the container (`Dockerfile` → `dist/backend/standalone.js`) and proxies to it via `backend.baseUrl`. **The container boots with NO per-tenant secrets** — it serves `/health` immediately and never crash-loops. Per request, the gateway injects:
- tenant context headers: `x-tenant-id`, `x-user-id`, `x-ext-slug`, `x-ext-token`, `x-ext-permissions`;
- per-tenant env as `x-ext-env-<lowercased key>` headers, notably **`x-ext-env-ext_hosting_encryption_key`** and **`x-ext-env-database_url`** (falling back to the container's `process.env` if present).

`createRequestControllersFactory()` reads the key + DSN from those headers per request and builds (cached by DSN+key) the Prisma client, crypto, and controllers. If a request arrives without a key/DSN, it returns `503 NOT_CONFIGURED` (the container stays up). Set `EXT_HOSTING_TENANT_CONTEXT_MODE=header` for this model.

## Tenant context modes
- **`authenticated`** (in-process default): the host runs its auth middleware and attaches `req.auth = { tenantId, userId, permissions }`. The extension trusts that. No `tenantId` is ever read from the request body/query.
- **`header`** (gateway/out-of-process): the gateway injects the headers above. The extension **verifies** `x-ext-token` = `base64url(payload).base64url(HMAC_SHA256(base64url(payload), EXT_PLATFORM_JWT_SECRET))`, where `payload = {t,u,s,exp}`, with a short TTL. If `EXT_PLATFORM_JWT_SECRET` is not configured, header-mode requests fail with `401` (the container still boots).

## WHM/cPanel per-server settings
Stored on each `ext_hosting_servers` row: `hostname`, `port` (default 2087), `verifySsl`. Disable SSL verification only for self-signed certs; it is a per-server security decision.
