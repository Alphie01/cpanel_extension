-- Idempotent seed (re-run safe via ON CONFLICT). Namespaced ext_echo_*.
INSERT INTO "ext_echo_settings" ("key", "value")
VALUES ('greeting', 'Merhaba')
ON CONFLICT ("key") DO NOTHING;
