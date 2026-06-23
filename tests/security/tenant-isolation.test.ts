import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { PERMISSIONS } from '../../src/shared/constants/permissions';
import { API_BASE, buildTestApp } from '../helpers/app';
import { testContextHeader } from '../helpers/fakes';

const A = testContextHeader('tenant-a', [PERMISSIONS.admin]);
const B = testContextHeader('tenant-b', [PERMISSIONS.admin]);

describe('tenant isolation', () => {
  it("tenant B cannot read tenant A's server", async () => {
    const { app } = buildTestApp();
    const created = await request(app)
      .post(`${API_BASE}/servers`)
      .set('x-test-context', A)
      .send({ name: 'A-Server', hostname: 'a.example.com' });

    const asB = await request(app)
      .get(`${API_BASE}/servers/${created.body.id}`)
      .set('x-test-context', B);
    expect(asB.status).toBe(404);
  });

  it('server lists are scoped per tenant', async () => {
    const { app } = buildTestApp();
    await request(app)
      .post(`${API_BASE}/servers`)
      .set('x-test-context', A)
      .send({ name: 'OnlyA', hostname: 'a.example.com' });

    const listB = await request(app).get(`${API_BASE}/servers`).set('x-test-context', B);
    expect(listB.body.total).toBe(0);
    const listA = await request(app).get(`${API_BASE}/servers`).set('x-test-context', A);
    expect(listA.body.total).toBe(1);
  });

  it("tenant B cannot read tenant A's token", async () => {
    const { app } = buildTestApp();
    const server = await request(app)
      .post(`${API_BASE}/servers`)
      .set('x-test-context', A)
      .send({ name: 'A-Srv', hostname: 'a.example.com' });
    const token = await request(app)
      .post(`${API_BASE}/servers/${server.body.id}/tokens`)
      .set('x-test-context', A)
      .send({ label: 'root', whmUser: 'root', token: 'a-secret-token' });

    const asB = await request(app)
      .get(`${API_BASE}/tokens/${token.body.id}`)
      .set('x-test-context', B);
    expect(asB.status).toBe(404);
  });

  it("tenant B cannot delete tenant A's server", async () => {
    const { app } = buildTestApp();
    const server = await request(app)
      .post(`${API_BASE}/servers`)
      .set('x-test-context', A)
      .send({ name: 'Protected', hostname: 'a.example.com' });

    const del = await request(app)
      .delete(`${API_BASE}/servers/${server.body.id}`)
      .set('x-test-context', B);
    expect(del.status).toBe(404);

    const stillThere = await request(app)
      .get(`${API_BASE}/servers/${server.body.id}`)
      .set('x-test-context', A);
    expect(stillThere.status).toBe(200);
  });
});
