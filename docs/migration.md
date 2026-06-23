# Migration

All tables are namespaced `ext_hosting_*` and created in the **assigned tenant only**. Migrations are **additive and non-destructive** — no column/table drops, no renames without data migration.

## Per-tenant
```bash
npm run migrate -- --tenantId=<tenantId>
```
Runs `prisma migrate deploy` against the current `DATABASE_URL` (the platform injects the correct tenant-scoped DSN). The `--tenantId` is used for logging/audit.

## All assigned tenants
```bash
npm run migrate:all-assigned
```
Reads `EXT_ASSIGNED_TENANT_DSNS` (a JSON array of `{ "tenantId", "databaseUrl" }`) the platform provides and deploys to each. Never targets all tenants implicitly.

## Initial schema
`prisma/migrations/0001_init/migration.sql` creates: `ext_hosting_servers`, `ext_hosting_tokens`, `ext_hosting_sftp_credentials`, `ext_hosting_accounts`, `ext_hosting_deployments`, `ext_hosting_deployment_logs`, `ext_hosting_operation_logs`, `ext_hosting_settings`, plus their enums, indexes, and foreign keys.

## Seed
```bash
npm run seed
```
Idempotent (upsert by stable `key`). Re-running never duplicates or clobbers tenant overrides.

## Policy for future migrations
- Additive only by default. New columns nullable or with defaults.
- A destructive change requires explicit confirmation and a data-migration path.
- Keep migrations deterministic and reviewed before production.
