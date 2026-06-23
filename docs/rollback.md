# Rollback

## Deactivate for a tenant
Unassign/deactivate the extension for the tenant from the Platform Admin. The `hosting_control.*` permissions are removed and the **Hosting Control** nav disappears. Data in `ext_hosting_*` is retained (non-destructive) unless you explicitly purge it.

## Reversing migrations
Migrations are additive (new tables/columns only), so a rollback is normally **deactivate, not drop**. If you must remove the schema:
1. Confirm no other tenant in the same database depends on the tables (they are tenant-scoped by `tenantId`, but tables may be shared in a single-DB deployment).
2. Drop in dependency order (children first): `ext_hosting_deployment_logs`, `ext_hosting_deployments`, `ext_hosting_tokens`, `ext_hosting_sftp_credentials`, `ext_hosting_accounts`, `ext_hosting_operation_logs`, `ext_hosting_settings`, `ext_hosting_servers`, then the enums.
3. This is destructive and irreversible — take a backup first.

## Token / credential rollback
- Deactivate a token via `PATCH /tokens/:id { "isActive": false }` or delete it (`DELETE /tokens/:id`, soft delete).
- Rotate a token via `PATCH /tokens/:id { "token": "<new>" }` — the old ciphertext is overwritten.

## Encryption key rotation
Every encrypted row stores a `keyId`. To rotate:
1. Provision the new key under a new `keyId`.
2. For each row, decrypt with the old key and re-encrypt with the new, updating `keyId`.
3. Retire the old key once no rows reference it.

## Verifying rollback
- The extension nav is gone for the tenant.
- `GET {apiPrefix}/servers` returns `401`/`403` for users without permission.
