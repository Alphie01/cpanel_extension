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
| `PORT` | — | — | `8080` | Standalone/dev server port. |

## Generating the encryption key
```bash
openssl rand -base64 32
```
Store as the secret `EXT_HOSTING_ENCRYPTION_KEY`. Rotating the key: provision a new key under a new `keyId`, re-encrypt existing rows, and update `keyId` per row (the schema carries a `keyId` column on every encrypted row for exactly this).

## Tenant context modes
- **`authenticated`** (in-process): the host runs its auth middleware and attaches `req.auth = { tenantId, userId, permissions }`. The extension trusts that. No `tenantId` is ever read from the request body/query.
- **`header`** (gateway/out-of-process, echo contract): the gateway injects `x-tenant-id`, `x-user-id`, `x-ext-slug`, `x-ext-token`, `x-ext-permissions`. The extension **verifies** `x-ext-token` = `base64url(payload).base64url(HMAC_SHA256(base64url(payload), EXT_PLATFORM_JWT_SECRET))`, where `payload = {t,u,s,exp}`, with a short TTL.

## WHM/cPanel per-server settings
Stored on each `ext_hosting_servers` row: `hostname`, `port` (default 2087), `verifySsl`. Disable SSL verification only for self-signed certs; it is a per-server security decision.
