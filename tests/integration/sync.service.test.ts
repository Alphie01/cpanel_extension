import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { PERMISSIONS } from '../../src/shared/constants/permissions';
import { API_BASE, buildTestApp, fakeWhmClient } from '../helpers/app';
import { testContextHeader } from '../helpers/fakes';

const ADMIN = testContextHeader('tenant-a', [PERMISSIONS.admin]);

describe('hosting sync service', () => {
  it('syncs every server for a tenant and is tenant-scoped', async () => {
    const whm = fakeWhmClient({
      listAccounts: async () => [{ user: 'a1', domain: 'a1.com', suspended: 0, diskused: '100', disklimit: '500' }],
    });
    const harness = buildTestApp({ whm });
    const { app, accountsRepo } = harness;

    const server = await request(app)
      .post(`${API_BASE}/servers`)
      .set('x-test-context', ADMIN)
      .send({ name: 'S', hostname: 's.example.com' });
    await request(app)
      .post(`${API_BASE}/servers/${server.body.id}/tokens`)
      .set('x-test-context', ADMIN)
      .send({ label: 'root', whmUser: 'root', token: 'a-real-whm-token' });

    const summary = await harness.syncTenant('tenant-a');
    expect(summary.servers).toBe(1);
    expect(summary.accounts).toBe(1);
    expect(summary.failedServers).toBe(0);
    expect(accountsRepo.rows.filter((r) => r.tenantId === 'tenant-a')).toHaveLength(1);

    // A different tenant has nothing to sync and sees no rows.
    const other = await harness.syncTenant('tenant-b');
    expect(other.servers).toBe(0);
    expect(accountsRepo.rows.filter((r) => r.tenantId === 'tenant-b')).toHaveLength(0);
  });

  it('counts a server with no token as a failed server', async () => {
    const harness = buildTestApp();
    const { app } = harness;
    await request(app)
      .post(`${API_BASE}/servers`)
      .set('x-test-context', ADMIN)
      .send({ name: 'NoToken', hostname: 'n.example.com' });

    const summary = await harness.syncTenant('tenant-a');
    expect(summary.servers).toBe(1);
    expect(summary.failedServers).toBe(1);
    expect(summary.accounts).toBe(0);
  });

  it('marks the server UNREACHABLE when WHM errors', async () => {
    const whm = fakeWhmClient({
      listAccounts: async () => {
        throw new Error('boom');
      },
    });
    const harness = buildTestApp({ whm });
    const { app, serversRepo } = harness;

    const server = await request(app)
      .post(`${API_BASE}/servers`)
      .set('x-test-context', ADMIN)
      .send({ name: 'S', hostname: 's.example.com' });
    await request(app)
      .post(`${API_BASE}/servers/${server.body.id}/tokens`)
      .set('x-test-context', ADMIN)
      .send({ label: 'root', whmUser: 'root', token: 'a-real-whm-token' });

    await harness.syncTenant('tenant-a');
    const row = serversRepo.rows.find((r) => r.id === server.body.id);
    expect(row?.status).toBe('UNREACHABLE');
  });
});
