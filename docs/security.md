# Security model

## Secrets at rest — AES-256-GCM
- WHM/cPanel tokens (`ext_hosting_tokens.tokenEnc`) and SFTP credentials (`ext_hosting_sftp_credentials.secretEnc`) are encrypted with AES-256-GCM.
- Storage format: `base64( iv[12] ‖ authTag[16] ‖ ciphertext )` plus a `keyId` column.
- A fresh random 12-byte IV per encryption; the GCM auth tag guarantees integrity — a tampered ciphertext fails to decrypt (`tests/unit/crypto.test.ts`).
- Key from `EXT_HOSTING_ENCRYPTION_KEY` (base64, 32 bytes), validated at boot (fail-fast).

## Secrets never leave the server
- Token/credential DTOs expose only `lastFour` — never plaintext or `tokenEnc`.
- Plaintext exists only momentarily inside `tokens.service` (encrypt) and `servers.service.testConnection` (decrypt → straight to the WHM client). It is never logged or returned.
- `redact.ts` masks any `token|secret|password|passphrase|authorization|api-key|private-key` key in logs and audit metadata.
- WHM errors never include the token; the auth header (`Authorization: whm user:token`) is the token's only exposure, for the duration of one outbound call.

## Tenant isolation
- Every repository method requires `tenantId` and includes it in the `where` clause — an id alone can never reach another tenant's row. Cross-tenant access returns `404` (`tests/security/tenant-isolation.test.ts`).
- The request body/query `tenantId` is never trusted; identity comes only from the authenticated context provider.

## Permissions
- Every sensitive action is guarded (`hosting_control.*`). `hosting_control.admin` is the superuser grant. Missing permission → `403`; missing context → `401` (`tests/security/permission-enforcement.test.ts`).
- Frontend gates menus/actions by permission, but the backend re-checks every call.

## Tenant context integrity (header mode)
- `x-ext-token` is verified as an HMAC-SHA256 over the base64url payload with `EXT_PLATFORM_JWT_SECRET`, with a short TTL and tenant/slug binding. Signature comparison is timing-safe.

## WHM/cPanel API hardening
- Per-server SSL verification (disable only for self-signed). Request timeouts, retry-with-backoff on transport/429/5xx, and per-host concurrency limiting.
- Errors are mapped to a safe envelope (`WHM_UNREACHABLE`, `WHM_AUTH_FAILED`, `WHM_API_ERROR`, `RATE_LIMITED`) with no stack traces, paths, or secrets leaked.

## Audit logging
Every server/token action writes `ext_hosting_operation_logs` (`server.create/update/delete/test_connection`, `token.create/update/delete`) with `tenantId`, `userId`, `action`, `entityType`, `entityId`, `status`, `requestId`, and **redacted** metadata.

## Deferred-but-guarded
Stub modules (accounts, metrics, email, domains, databases, FTP, deployments) run full auth + permission + validation before returning `501 NOT_IMPLEMENTED`, so the security surface is real before the feature is.
