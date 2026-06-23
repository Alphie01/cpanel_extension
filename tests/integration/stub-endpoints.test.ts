import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { PERMISSIONS } from '../../src/shared/constants/permissions';
import { API_BASE, buildTestApp } from '../helpers/app';
import { testContextHeader } from '../helpers/fakes';

// Admin context passes every permission guard, so a 501 proves the route is
// fully wired (auth + permission + param validation ran) before the stub body.
const ADMIN = testContextHeader('tenant-a', [PERMISSIONS.admin]);

// Accounts, metrics, email, domains, and databases are implemented; FTP and
// deployments remain stubbed.
const STUB_GET_ROUTES = [
  '/accounts/acc-1/ftp-accounts',
  '/accounts/acc-1/deployments',
  '/deployments/dep-1',
];

describe('stub endpoints', () => {
  it.each(STUB_GET_ROUTES)('GET %s returns 501 NOT_IMPLEMENTED', async (path) => {
    const { app } = buildTestApp();
    const res = await request(app).get(`${API_BASE}${path}`).set('x-test-context', ADMIN);
    expect(res.status).toBe(501);
    expect(res.body.error.code).toBe('NOT_IMPLEMENTED');
  });

  it('POST /accounts/:id/deployments returns 501', async () => {
    const { app } = buildTestApp();
    const res = await request(app)
      .post(`${API_BASE}/accounts/acc-1/deployments`)
      .set('x-test-context', ADMIN)
      .send({});
    expect(res.status).toBe(501);
    expect(res.body.error.code).toBe('NOT_IMPLEMENTED');
  });

  it('POST /deployments/:id/rollback returns 501', async () => {
    const { app } = buildTestApp();
    const res = await request(app)
      .post(`${API_BASE}/deployments/dep-1/rollback`)
      .set('x-test-context', ADMIN);
    expect(res.status).toBe(501);
    expect(res.body.error.code).toBe('NOT_IMPLEMENTED');
  });
});
