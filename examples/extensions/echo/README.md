# Echo — reference Relation AI extension

Minimal, end-to-end reference for the tenant-extension platform. Demonstrates the
manifest, namespaced migrations + seed, a gateway-reachable API, a scheduled job,
and an iframe UI. Out-of-process: the platform never runs this code in its API —
it builds/runs the container (or you host it) and proxies to it.

## What it shows
- `extension.manifest.json` — full manifest (frontend routes + appUrl, backend baseUrl/healthUrl, database migrationsPath/seed/tablePrefix, docker, permissions, env, jobs).
- `prisma/migrations/0001_init.sql` + `prisma/seed.sql` — **namespaced** `ext_echo_*` only (platform rejects anything else; destructive needs confirm).
- `src/index.js` — `/health`, `/ui` (iframe), `/api/ping` (echoes tenant headers), `/jobs/:name` (scheduler target). Reads `x-tenant-id` / `x-ext-token` / `x-ext-env-*`.
- `Dockerfile` — prebuilt image the runner deploys (or platform builds via `/build`).

## Install (platform admin)
1. Admin → Eklentiler → Yeni Eklenti. Either paste this manifest (UPLOAD) or set the
   repo URL + Pull (GitHub, tarball — loads manifest + migration/seed SQL).
2. Detail → Container → **İmaj Build** (or push a prebuilt `ext-echo` image) → **Başlat**.
3. Detail → Tenant'lar → assign a tenant → **Migrate & Aktifleştir**
   (runs `ext_echo_*` migrations + seed in that tenant only, registers `echo.*` perms).
4. The tenant admin sees **Echo** in the sidebar; the iframe loads `/ui`; its API is at
   `/api/ext-gw/echo/*`; `echo-sync` fires on its cron with an `ExtensionJobRun` record.

## Notes
- Per-tenant secrets arrive as request headers (`x-ext-env-<key>`), never baked into the
  shared container.
- Verify `x-ext-token` (HMAC-SHA256 of `{t,u,s,exp}` with the platform `JWT_SECRET`,
  base64url `payload.sig`, 60s TTL) before trusting the tenant context.
- Tenant DB access for `ext_echo_*` tables requires a provisioned scoped DSN (platform
  hardening item) — this reference echoes data and does not connect to the DB.
