# Installation

## Prerequisites
- Node.js ≥ 20.
- A PostgreSQL database reachable via the tenant-scoped `DATABASE_URL` the platform injects.
- A 32-byte encryption key (`openssl rand -base64 32`) provisioned as the secret `EXT_HOSTING_ENCRYPTION_KEY`.

## Build
```bash
npm install
npm run prisma:generate
npm run build          # prisma generate + tsc → dist/
```

## Register the extension (Platform Admin)
1. **Admin → Extensions → New Extension.** Either paste `extension.manifest.json` (UPLOAD) or set the repo URL and Pull (loads manifest + `prisma/migrations` + `prisma/seed.ts`).
2. Provision the secret env vars (at minimum `EXT_HOSTING_ENCRYPTION_KEY`). Mark them secret; never expose to the frontend.
3. Decide the runtime:
   - **In-process** (default): the host mounts `createRouter()` at `apiPrefix`.
   - **Out-of-process** (fallback): build/start the container (`Dockerfile`), set `EXT_HOSTING_TENANT_CONTEXT_MODE=header` and `EXT_PLATFORM_JWT_SECRET`.

## Assign a tenant
1. **Detail → Tenants → assign a tenant.**
2. **Migrate & Activate** — runs the `ext_hosting_*` migrations + seed in that tenant only and registers the `hosting_control.*` permissions.
3. Grant the relevant `hosting_control.*` permissions to the appropriate roles. The tenant admin then sees **Hosting Control** in the dashboard sidebar.

## Verify
- `GET {apiPrefix}/health` → `{ "ok": true }`.
- Create a server, add a WHM token, run **Test connection**.
