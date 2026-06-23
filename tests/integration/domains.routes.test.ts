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
    { cpanelUser: 'acct', domain: 'main.example.com', plan: null, suspended: false, raw: {} },
    new Date(),
  );
  return account.id;
}

describe('domains routes', () => {
  it('lists domains with type and SSL status', async () => {
    const harness = buildTestApp({
      cpanel: fakeCpanelClient({
        listDomains: async () => ({
          main: 'main.example.com',
          addon: ['addon.example.com'],
          sub: ['blog.main.example.com'],
          parked: ['parked.example.com'],
        }),
        listSslDomains: async () => ['main.example.com'],
      }),
    });
    const accountId = await seedAccount(harness.app, harness.accountsRepo);

    const res = await request(harness.app)
      .get(`${API_BASE}/accounts/${accountId}/domains`)
      .set('x-test-context', ADMIN);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(4);
    const main = res.body.find((d: { type: string }) => d.type === 'main');
    expect(main.domain).toBe('main.example.com');
    expect(main.sslStatus).toBe('active');
    const addon = res.body.find((d: { type: string }) => d.type === 'addon');
    expect(addon.sslStatus).toBe('none');
  });

  it('still lists domains when the SSL lookup fails', async () => {
    const harness = buildTestApp({
      cpanel: fakeCpanelClient({
        listDomains: async () => ({ main: 'main.example.com', addon: [], sub: [], parked: [] }),
        listSslDomains: async () => {
          throw new Error('ssl boom');
        },
      }),
    });
    const accountId = await seedAccount(harness.app, harness.accountsRepo);
    const res = await request(harness.app)
      .get(`${API_BASE}/accounts/${accountId}/domains`)
      .set('x-test-context', ADMIN);
    expect(res.status).toBe(200);
    expect(res.body[0].sslStatus).toBe('none');
  });

  it('triggers AutoSSL and audits it', async () => {
    const harness = buildTestApp();
    const accountId = await seedAccount(harness.app, harness.accountsRepo);
    const res = await request(harness.app)
      .post(`${API_BASE}/accounts/${accountId}/domains/autossl`)
      .set('x-test-context', ADMIN);
    expect(res.status).toBe(200);
    expect(harness.audit.records.some((r) => r.action === 'domain.autossl')).toBe(true);
  });
});
