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

function harnessWithEmails() {
  return buildTestApp({
    cpanel: fakeCpanelClient({
      listEmailAccounts: async () => [
        { email: 'info@acct.example.com', quotaMb: 250, usedMb: 12, suspended: false },
      ],
    }),
  });
}

describe('email routes', () => {
  it('lists email accounts for an account', async () => {
    const harness = harnessWithEmails();
    const accountId = await seedAccount(harness.app, harness.accountsRepo);
    const res = await request(harness.app)
      .get(`${API_BASE}/accounts/${accountId}/email-accounts`)
      .set('x-test-context', ADMIN);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].email).toBe('info@acct.example.com');
  });

  it('creates an email account without echoing or logging the password', async () => {
    const harness = harnessWithEmails();
    const accountId = await seedAccount(harness.app, harness.accountsRepo);
    const res = await request(harness.app)
      .post(`${API_BASE}/accounts/${accountId}/email-accounts`)
      .set('x-test-context', ADMIN)
      .send({ user: 'sales', domain: 'acct.example.com', password: 'StrongPass1', quotaMb: 500 });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe('sales@acct.example.com');
    expect(res.body.quotaMb).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('StrongPass1');
    expect(JSON.stringify(harness.audit.records)).not.toContain('StrongPass1');
    expect(harness.audit.records.some((r) => r.action === 'email.create')).toBe(true);
  });

  it('rejects a weak password with 422', async () => {
    const harness = harnessWithEmails();
    const accountId = await seedAccount(harness.app, harness.accountsRepo);
    const res = await request(harness.app)
      .post(`${API_BASE}/accounts/${accountId}/email-accounts`)
      .set('x-test-context', ADMIN)
      .send({ user: 'x', domain: 'acct.example.com', password: 'short', quotaMb: 0 });
    expect(res.status).toBe(422);
  });

  it('updates and deletes an email account', async () => {
    const harness = harnessWithEmails();
    const accountId = await seedAccount(harness.app, harness.accountsRepo);
    const emailId = encodeURIComponent('info@acct.example.com');

    const patched = await request(harness.app)
      .patch(`${API_BASE}/accounts/${accountId}/email-accounts/${emailId}`)
      .set('x-test-context', ADMIN)
      .send({ quotaMb: 1000 });
    expect(patched.status).toBe(200);
    expect(patched.body.email).toBe('info@acct.example.com');

    const removed = await request(harness.app)
      .delete(`${API_BASE}/accounts/${accountId}/email-accounts/${emailId}`)
      .set('x-test-context', ADMIN);
    expect(removed.status).toBe(204);
    expect(harness.audit.records.some((r) => r.action === 'email.delete')).toBe(true);
  });

  it('returns 404 when the account does not exist', async () => {
    const harness = harnessWithEmails();
    const res = await request(harness.app)
      .get(`${API_BASE}/accounts/missing/email-accounts`)
      .set('x-test-context', ADMIN);
    expect(res.status).toBe(404);
  });
});
