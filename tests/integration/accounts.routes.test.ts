import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { PERMISSIONS } from '../../src/shared/constants/permissions';
import { API_BASE, buildTestApp, fakeWhmClient } from '../helpers/app';
import { testContextHeader } from '../helpers/fakes';

const ADMIN = testContextHeader('tenant-a', [PERMISSIONS.admin]);

function appWithAccounts() {
  const whm = fakeWhmClient({
    listAccounts: async () => [
      { user: 'acctone', domain: 'one.example.com', plan: 'Gold', suspended: 0, diskused: '512', disklimit: '1024' },
      { user: 'accttwo', domain: 'two.example.com', plan: 'Silver', suspended: 1, diskused: 'unlimited', disklimit: 'unlimited' },
    ],
    accountSummary: async (_creds, user) => ({
      user,
      domain: `${user}.example.com`,
      plan: 'Platinum',
      suspended: 0,
      diskused: '600',
      disklimit: '2048',
    }),
  });
  return buildTestApp({ whm });
}

async function seedServerWithToken(app: import('express').Express): Promise<string> {
  const server = await request(app)
    .post(`${API_BASE}/servers`)
    .set('x-test-context', ADMIN)
    .send({ name: 'WHM', hostname: 'whm.example.com' });
  await request(app)
    .post(`${API_BASE}/servers/${server.body.id}/tokens`)
    .set('x-test-context', ADMIN)
    .send({ label: 'root', whmUser: 'root', token: 'a-real-whm-token' });
  return server.body.id as string;
}

describe('accounts routes', () => {
  it('syncs accounts from WHM and lists them', async () => {
    const { app } = appWithAccounts();
    const serverId = await seedServerWithToken(app);

    const sync = await request(app)
      .post(`${API_BASE}/servers/${serverId}/sync`)
      .set('x-test-context', ADMIN);
    expect(sync.status).toBe(200);
    expect(sync.body.accounts).toBe(2);

    const list = await request(app).get(`${API_BASE}/accounts`).set('x-test-context', ADMIN);
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(2);
    const one = list.body.items.find((a: { cpanelUser: string }) => a.cpanelUser === 'acctone');
    expect(one.diskUsedMb).toBe(512);
    expect(one.diskLimitMb).toBe(1024);
  });

  it('filters by suspended', async () => {
    const { app } = appWithAccounts();
    const serverId = await seedServerWithToken(app);
    await request(app).post(`${API_BASE}/servers/${serverId}/sync`).set('x-test-context', ADMIN);

    const suspended = await request(app)
      .get(`${API_BASE}/accounts?suspended=true`)
      .set('x-test-context', ADMIN);
    expect(suspended.body.total).toBe(1);
    expect(suspended.body.items[0].cpanelUser).toBe('accttwo');
  });

  it('returns metrics and refreshes a single account', async () => {
    const { app } = appWithAccounts();
    const serverId = await seedServerWithToken(app);
    await request(app).post(`${API_BASE}/servers/${serverId}/sync`).set('x-test-context', ADMIN);

    const list = await request(app).get(`${API_BASE}/accounts`).set('x-test-context', ADMIN);
    const accountId = list.body.items[0].id as string;

    const metrics = await request(app)
      .get(`${API_BASE}/accounts/${accountId}/metrics`)
      .set('x-test-context', ADMIN);
    expect(metrics.status).toBe(200);
    expect(typeof metrics.body.suspended).toBe('boolean');

    const refreshed = await request(app)
      .post(`${API_BASE}/accounts/${accountId}/refresh`)
      .set('x-test-context', ADMIN);
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.diskUsedMb).toBe(600);
    expect(refreshed.body.plan).toBe('Platinum');
  });

  it('sync fails clearly when the server has no WHM token', async () => {
    const { app } = appWithAccounts();
    const server = await request(app)
      .post(`${API_BASE}/servers`)
      .set('x-test-context', ADMIN)
      .send({ name: 'NoToken', hostname: 'n.example.com' });
    const sync = await request(app)
      .post(`${API_BASE}/servers/${server.body.id}/sync`)
      .set('x-test-context', ADMIN);
    expect(sync.status).toBe(422);
  });

  it('returns 404 for an unknown account', async () => {
    const { app } = appWithAccounts();
    const res = await request(app).get(`${API_BASE}/accounts/missing`).set('x-test-context', ADMIN);
    expect(res.status).toBe(404);
  });
});
