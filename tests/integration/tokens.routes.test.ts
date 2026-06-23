import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { PERMISSIONS } from '../../src/shared/constants/permissions';
import { API_BASE, buildTestApp } from '../helpers/app';
import { testContextHeader } from '../helpers/fakes';

const ADMIN = testContextHeader('tenant-a', [PERMISSIONS.admin]);

async function createServer(app: import('express').Express): Promise<string> {
  const res = await request(app)
    .post(`${API_BASE}/servers`)
    .set('x-test-context', ADMIN)
    .send({ name: 'S1', hostname: 's1.example.com' });
  return res.body.id as string;
}

describe('tokens routes', () => {
  it('creates a token and never returns the secret', async () => {
    const { app } = buildTestApp();
    const serverId = await createServer(app);

    const res = await request(app)
      .post(`${API_BASE}/servers/${serverId}/tokens`)
      .set('x-test-context', ADMIN)
      .send({ label: 'Root', whmUser: 'root', token: 'super-secret-value' });

    expect(res.status).toBe(201);
    expect(res.body.lastFour).toBe('alue');
    expect(res.body.tokenEnc).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('super-secret-value');
  });

  it('lists tokens for a server', async () => {
    const { app } = buildTestApp();
    const serverId = await createServer(app);
    await request(app)
      .post(`${API_BASE}/servers/${serverId}/tokens`)
      .set('x-test-context', ADMIN)
      .send({ label: 'A', whmUser: 'root', token: 'token-value-one' });

    const list = await request(app)
      .get(`${API_BASE}/servers/${serverId}/tokens`)
      .set('x-test-context', ADMIN);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].lastFour).toBe('-one');
  });

  it('rejects a duplicate label for the same server', async () => {
    const { app } = buildTestApp();
    const serverId = await createServer(app);
    const body = { label: 'Same', whmUser: 'root', token: 'token-value-xyz' };
    await request(app)
      .post(`${API_BASE}/servers/${serverId}/tokens`)
      .set('x-test-context', ADMIN)
      .send(body);
    const dup = await request(app)
      .post(`${API_BASE}/servers/${serverId}/tokens`)
      .set('x-test-context', ADMIN)
      .send(body);
    expect(dup.status).toBe(409);
  });

  it('rotates a token (PATCH) and audits it', async () => {
    const { app, audit } = buildTestApp();
    const serverId = await createServer(app);
    const created = await request(app)
      .post(`${API_BASE}/servers/${serverId}/tokens`)
      .set('x-test-context', ADMIN)
      .send({ label: 'Rotate', whmUser: 'root', token: 'old-token-value' });

    const res = await request(app)
      .patch(`${API_BASE}/tokens/${created.body.id}`)
      .set('x-test-context', ADMIN)
      .send({ token: 'new-token-value' });

    expect(res.status).toBe(200);
    expect(res.body.lastFour).toBe('alue');
    expect(audit.records.some((r) => r.action === 'token.update')).toBe(true);
  });
});
