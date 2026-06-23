import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { PERMISSIONS } from '../../src/shared/constants/permissions';
import { API_BASE, buildTestApp, fakeCpanelClient } from '../helpers/app';
import { testContextHeader, type InMemoryAccountsRepository } from '../helpers/fakes';

const ADMIN = testContextHeader('tenant-a', [PERMISSIONS.admin]);

async function seedAccount(
  app: import('express').Express,
  accountsRepo: InMemoryAccountsRepository,
): Promise<string> {
  const server = await request(app)
    .post(`${API_BASE}/servers`)
    .set('x-test-context', ADMIN)
    .send({ name: 'WHM', hostname: 'whm.example.com' });
  await request(app)
    .post(`${API_BASE}/servers/${server.body.id}/tokens`)
    .set('x-test-context', ADMIN)
    .send({ label: 'root', whmUser: 'root', token: 'a-real-whm-token' });
  const account = await accountsRepo.upsertOne(
    'tenant-a',
    server.body.id as string,
    { cpanelUser: 'acct', domain: 'acct.example.com', plan: null, suspended: false, raw: {} },
    new Date(),
  );
  return account.id;
}

function harnessWithDbs() {
  return buildTestApp({
    cpanel: fakeCpanelClient({
      listDatabases: async () => [{ name: 'acct_db1', users: ['acct_u1'], sizeMb: 5 }],
      listDatabaseUsers: async () => ['acct_u1', 'acct_u2'],
    }),
  });
}

describe('databases routes', () => {
  it('returns databases and users overview', async () => {
    const harness = harnessWithDbs();
    const accountId = await seedAccount(harness.app, harness.accountsRepo);
    const res = await request(harness.app)
      .get(`${API_BASE}/accounts/${accountId}/databases`)
      .set('x-test-context', ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.databases).toHaveLength(1);
    expect(res.body.databases[0]).toEqual({ name: 'acct_db1', users: ['acct_u1'], sizeMb: 5 });
    expect(res.body.users).toEqual([{ user: 'acct_u1' }, { user: 'acct_u2' }]);
  });

  it('creates a database and a user without logging the password', async () => {
    const harness = harnessWithDbs();
    const accountId = await seedAccount(harness.app, harness.accountsRepo);

    const db = await request(harness.app)
      .post(`${API_BASE}/accounts/${accountId}/databases`)
      .set('x-test-context', ADMIN)
      .send({ name: 'acct_new' });
    expect(db.status).toBe(201);

    const user = await request(harness.app)
      .post(`${API_BASE}/accounts/${accountId}/database-users`)
      .set('x-test-context', ADMIN)
      .send({ name: 'acct_newuser', password: 'StrongPass1' });
    expect(user.status).toBe(201);
    expect(JSON.stringify(harness.audit.records)).not.toContain('StrongPass1');
    expect(harness.audit.records.some((r) => r.action === 'database.create')).toBe(true);
  });

  it('assigns a user to a database', async () => {
    const harness = harnessWithDbs();
    const accountId = await seedAccount(harness.app, harness.accountsRepo);
    const res = await request(harness.app)
      .post(`${API_BASE}/accounts/${accountId}/database-assignments`)
      .set('x-test-context', ADMIN)
      .send({ user: 'acct_u1', database: 'acct_db1' });
    expect(res.status).toBe(200);
  });

  it('refuses to delete a database without confirmation', async () => {
    const harness = harnessWithDbs();
    const accountId = await seedAccount(harness.app, harness.accountsRepo);
    const res = await request(harness.app)
      .delete(`${API_BASE}/accounts/${accountId}/databases/acct_db1`)
      .set('x-test-context', ADMIN);
    expect(res.status).toBe(422);
  });

  it('deletes a database with confirm=true and audits it', async () => {
    const harness = harnessWithDbs();
    const accountId = await seedAccount(harness.app, harness.accountsRepo);
    const res = await request(harness.app)
      .delete(`${API_BASE}/accounts/${accountId}/databases/acct_db1?confirm=true`)
      .set('x-test-context', ADMIN);
    expect(res.status).toBe(204);
    expect(harness.audit.records.some((r) => r.action === 'database.delete')).toBe(true);
  });

  it('rejects a weak database-user password', async () => {
    const harness = harnessWithDbs();
    const accountId = await seedAccount(harness.app, harness.accountsRepo);
    const res = await request(harness.app)
      .post(`${API_BASE}/accounts/${accountId}/database-users`)
      .set('x-test-context', ADMIN)
      .send({ name: 'acct_x', password: 'short' });
    expect(res.status).toBe(422);
  });
});
