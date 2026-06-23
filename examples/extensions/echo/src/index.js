/* eslint-disable */
'use strict';
/**
 * Echo — reference Relation AI extension backend (out-of-process).
 * Reached by the platform gateway at /api/ext-gw/echo/* and by the job scheduler.
 * Every request carries tenant context headers injected by the platform:
 *   x-tenant-id, x-user-id, x-ext-slug, x-ext-token (HMAC, verify!), x-ext-env-*
 */
const express = require('express');
const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT || 8080);

function ctx(req) {
  return {
    tenantId: req.headers['x-tenant-id'] || null,
    userId: req.headers['x-user-id'] || null,
    slug: req.headers['x-ext-slug'] || null,
    // Per-tenant secrets arrive as x-ext-env-<lowercased key>.
    greeting: req.headers['x-ext-env-echo_greeting'] || process.env.ECHO_GREETING || 'Hello',
    // Phase 6: a least-privilege DSN scoped to ext_echo_* in THIS tenant's DB,
    // injected per request when EXT_DB_PROVISION_ENABLED on the platform.
    dbUrl: req.headers['x-ext-env-database_url'] || process.env.DATABASE_URL || null,
  };
}

app.get('/health', (_req, res) => res.json({ ok: true }));

// Minimal UI for the dashboard iframe (manifest.frontend.appUrl).
app.get('/ui', (req, res) => {
  const c = ctx(req);
  res.type('html').send(`<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;padding:24px">
    <h2>Echo Extension</h2><p>${c.greeting}, tenant <code>${c.tenantId ?? '(none)'}</code> 👋</p>
    <p>This UI is served by the extension and embedded via a sandboxed iframe.</p></body>`);
});

// Example tenant-scoped API (reached via /api/ext-gw/echo/api/ping).
app.all('/api/ping', (req, res) => {
  res.json({ ok: true, echo: req.body ?? null, ...ctx(req) });
});

// Phase 6 DB demo (reached via /api/ext-gw/echo/api/db). Uses the injected
// per-request DSN to write + read ITS OWN ext_echo_* tables in the tenant DB.
// A short-lived connection per request keeps the reference simple; a real
// extension would pool keyed by the DSN. Fails soft when no DSN is present.
app.all('/api/db', async (req, res) => {
  const c = ctx(req);
  if (!c.dbUrl) return res.status(503).json({ ok: false, error: 'no DATABASE_URL (enable EXT_DB_PROVISION_ENABLED)' });
  const { Client } = require('pg');
  const client = new Client({ connectionString: c.dbUrl });
  try {
    await client.connect();
    const id = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    await client.query('INSERT INTO ext_echo_log (id, tenant_id, message) VALUES ($1, $2, $3)', [id, c.tenantId ?? 'unknown', `${c.greeting} from ${c.userId ?? 'anon'}`]);
    const { rows } = await client.query('SELECT count(*)::int AS count FROM ext_echo_log');
    res.json({ ok: true, inserted: id, total: rows[0]?.count ?? 0 });
  } catch (err) {
    res.status(500).json({ ok: false, error: String((err && err.message) || err) });
  } finally {
    await client.end().catch(() => {});
  }
});

// Scheduled job endpoint. The platform POSTs { jobName, runId, tenantId }.
// Sync: return 2xx → COMPLETED. Async: return 202 and later POST
// {API}/api/v1/extensions/jobs/{runId}/report (with x-ext-token) to finish.
app.post('/jobs/:name', (req, res) => {
  const c = ctx(req);
  console.log(`[echo] job ${req.params.name} for tenant ${c.tenantId} (run ${req.body?.runId})`);
  res.json({ ok: true, job: req.params.name, tenantId: c.tenantId });
});

app.listen(PORT, () => console.log(`[ext-echo] listening on ${PORT}`));
