import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { PERMISSIONS } from '../../src/shared/constants/permissions';
import { API_BASE, buildTestApp } from '../helpers/app';
import { testContextHeader } from '../helpers/fakes';

describe('permission enforcement', () => {
  it('returns 403 without the required permission', async () => {
    const { app } = buildTestApp();
    const res = await request(app)
      .post(`${API_BASE}/servers`)
      .set('x-test-context', testContextHeader('t', []))
      .send({ name: 'X', hostname: 'x.example.com' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.details.required).toBe(PERMISSIONS.servers.create);
  });

  it('admin permission bypasses specific guards', async () => {
    const { app } = buildTestApp();
    const res = await request(app)
      .post(`${API_BASE}/servers`)
      .set('x-test-context', testContextHeader('t', [PERMISSIONS.admin]))
      .send({ name: 'X', hostname: 'x.example.com' });
    expect(res.status).toBe(201);
  });

  it('returns 401 when no tenant context is present', async () => {
    const { app } = buildTestApp();
    const res = await request(app).get(`${API_BASE}/servers`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TENANT_CONTEXT_MISSING');
  });

  it('enforces permission before reaching a stub (403, not 501)', async () => {
    const { app } = buildTestApp();
    const denied = await request(app)
      .get(`${API_BASE}/accounts/acc-1/ftp-accounts`)
      .set('x-test-context', testContextHeader('t', []));
    expect(denied.status).toBe(403);

    const allowed = await request(app)
      .get(`${API_BASE}/accounts/acc-1/ftp-accounts`)
      .set('x-test-context', testContextHeader('t', [PERMISSIONS.ftp.view]));
    expect(allowed.status).toBe(501);
  });
});
