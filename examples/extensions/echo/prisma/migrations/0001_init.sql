-- Echo reference extension — initial schema. Every object is namespaced ext_echo_*
-- (platform rejects anything else). Created in the assigned tenant's schema only.
CREATE TABLE IF NOT EXISTS "ext_echo_log" (
  "id"         TEXT PRIMARY KEY,
  "tenant_id"  TEXT NOT NULL,
  "message"    TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "ext_echo_log_tenant_idx" ON "ext_echo_log" ("tenant_id", "created_at");

CREATE TABLE IF NOT EXISTS "ext_echo_settings" (
  "key"        TEXT PRIMARY KEY,
  "value"      TEXT,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
