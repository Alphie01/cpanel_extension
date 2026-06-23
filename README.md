# cPanel & WHM Manager — Relation AI Extension

Tenant-specific extension for the Relation AI platform that turns Relation AI into a hosting control & deployment center for WHM/cPanel servers.

> **Release status.** Implemented to production depth: **Server Connections**, **encrypted Multi-Token management**, **Account listing / detail / metrics + the per-tenant sync worker**, **Email account management**, **Domain management** (list main/addon/subdomain/parked with SSL status + AutoSSL trigger), and **Database management** (list databases & users, create database/user, assign user, delete with confirmation) — all via cPanel UAPI through the WHM proxy. Still **registered but stubbed** (Prisma models, routes, permissions, validation, and frontend routes in place; handlers return `501 NOT_IMPLEMENTED`): FTP management and the SFTP deployment engine with backup/rollback. Remaining work is purely additive.

## What it does

- Connect and manage **multiple** WHM/cPanel servers per tenant.
- Store **multiple** API tokens per server, **encrypted at rest** (AES-256-GCM). Raw tokens are never returned to the frontend or written to logs.
- Test connectivity to a server using its active WHM token (live WHM `version` call).
- **Sync** a server's cPanel accounts (WHM `listaccts`) into a tenant-scoped cache — manually (`POST /servers/:id/sync`) or via the scheduled `hosting-control-sync` worker — and browse account **listing, detail, and metrics** (disk/bandwidth/suspended), with single-account refresh (WHM `accountsummary`).
- Manage **email accounts** per cPanel account: list (with quota/usage), create, change password, change quota, suspend/unsuspend, delete — driven through the WHM `cpanel` proxy so the existing WHM token is reused (no separate cPanel token). Passwords are write-only and never logged or returned.
- Manage **domains**: list main / addon / subdomain / parked domains with SSL status, and trigger AutoSSL.
- Manage **databases**: list MySQL databases (with size/users) and database users; create databases and users; assign a user to a database; delete users; delete databases (destructive — requires `?confirm=true`). Passwords write-only.
- Full audit trail of every server / token / account / email / domain / database action.
- (Planned) FTP management, and an SFTP deployment engine.

## Architecture

In-process TypeScript module per the Relation AI extension standard:

- **Backend**: `route → controller → service → repository`, mounted by the host at the manifest `apiPrefix` (`/api/extensions/cpanel-whm-manager`) via `createRouter()` (`src/backend/index.ts`). Does **not** call `app.listen()` in production; `src/backend/standalone.ts` is for local dev only.
- **Database**: Prisma schema `prisma/extension.prisma`, all tables namespaced `ext_hosting_*`.
- **Frontend**: React routes under `/dashboard/extensions/hosting-control`, permission-aware, importing host UI primitives via the `@host/design-system` alias.
- **Tenant context**: pluggable — `authenticated` (host-injected `req.auth`, default) or `header` (echo-style gateway headers with `x-ext-token` HMAC verification). Selected by `EXT_HOSTING_TENANT_CONTEXT_MODE`.

> ⚠️ **Loader note.** The platform's only proven reference extension (`examples/extensions/echo`) runs **out-of-process** and passes tenant context as gateway headers. This extension targets the in-process model per project decision; confirm the host supports an in-process loader before production deploy, or switch `EXT_HOSTING_TENANT_CONTEXT_MODE=header` and run the bundled container.

## Required permissions

All namespaced under `hosting_control.*` (see `extension.manifest.json`). Key ones: `hosting_control.view`, `servers.{view,create,edit,delete,test_connection}`, `tokens.{view,create,edit,delete}`, and `hosting_control.admin` (superuser). The rest gate the planned modules.

## Required environment variables

| Variable | Required | Secret | Purpose |
|---|---|---|---|
| `DATABASE_URL` | ✅ | ✅ | Tenant-scoped Prisma datasource (host-injected). |
| `EXT_HOSTING_ENCRYPTION_KEY` | ✅ | ✅ | Base64 32-byte key for AES-256-GCM. `openssl rand -base64 32`. |
| `EXT_HOSTING_TENANT_CONTEXT_MODE` | — | — | `authenticated` (default) or `header`. |
| `EXT_PLATFORM_JWT_SECRET` | only in `header` mode | ✅ | Verifies the `x-ext-token` HMAC. |
| `EXT_HOSTING_WHM_TIMEOUT_MS` | — | — | WHM HTTP timeout (default 15000). |
| `EXT_HOSTING_WHM_VERIFY_SSL` | — | — | Default SSL verification (per-server override stored on the row). |

See `.env.example`. Boot fails fast if `EXT_HOSTING_ENCRYPTION_KEY` is missing or not 32 bytes.

## Local development

```bash
npm install
cp .env.example .env            # set EXT_HOSTING_ENCRYPTION_KEY (openssl rand -base64 32)
npm run prisma:generate
npm run typecheck
npm test
npm run dev                     # standalone server on PORT (default 8080)
```

## Install on the platform (admin)

See [docs/installation.md](docs/installation.md). Summary:
1. Add the extension (paste manifest or pull the repo).
2. Build/start the container if running out-of-process; otherwise the host loads the in-process router.
3. Assign a tenant → run migrations + seed for that tenant → activate. Permissions `hosting_control.*` are registered.

## Migration & seed

See [docs/migration.md](docs/migration.md). Per-tenant: `npm run migrate -- --tenantId=<id>`; all assigned: `npm run migrate:all-assigned`. Seed is idempotent: `npm run seed`.

## Rollback

See [docs/rollback.md](docs/rollback.md). Deactivate per tenant; migrations are additive (no destructive drops); rotate/revoke tokens via the API; encryption supports `keyId`-based key rotation.

## Security

See [docs/security.md](docs/security.md). AES-256-GCM at rest, tenant-scoped repositories (an id can never reach another tenant's row), secrets never sent to the frontend or logged, audit logging of every action.

## Tests

```bash
npm run typecheck       # strict TS
npm run lint            # bans any/console/TODO, no-floating-promises
npm run manifest:validate
npm test                # crypto, tenant isolation, permissions, WHM client (mocked), validators, seed idempotency, stub-501
npm run build           # prisma generate + tsc
```

**Cannot be verified without your infrastructure**: live WHM/cPanel calls against a real server, live SFTP, and the host's real `authenticated`-mode context injection. The test suite covers all code paths short of real network/TLS.

## Troubleshooting

- **Container exits: `Cannot find module dist/backend/standalone.js`** → the image was built from a stale source (before `src/backend/standalone.ts` existed) or `tsconfig.build.json` `rootDir` was wrong. Rebuild from current source; `npm run build` must produce `dist/backend/standalone.js`.
- **Container crash-loops at boot** → should no longer happen: the out-of-process container (`standalone.ts`) boots with no secrets. If it still restarts, check the logs for a non-config error. `/health` must return `{ ok: true }` even before any tenant is configured.
- **`503 NOT_CONFIGURED` on API calls** → the request had no encryption key / DSN. In header mode the gateway must inject `x-ext-env-ext_hosting_encryption_key` + `x-ext-env-database_url`; or set them as container `process.env` for a single-tenant deployment.
- **In-process/worker boot error about the encryption key** → `createContainer()`/`loadEnv()` requires `EXT_HOSTING_ENCRYPTION_KEY` (base64, 32 bytes). Regenerate with `openssl rand -base64 32`.
- **401 `UNAUTHENTICATED` / `TENANT_CONTEXT_MISSING`** → host not injecting `req.auth` (authenticated mode), or `x-ext-token` HMAC invalid / `EXT_PLATFORM_JWT_SECRET` not set (header mode).
- **`WHM_AUTH_FAILED` on test-connection** → token invalid/expired or insufficient WHM ACL.
- **`WHM_UNREACHABLE`** → host/port wrong, firewall, or TLS failure (try toggling per-server SSL verification if self-signed).
