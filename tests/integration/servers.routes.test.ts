import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { PERMISSIONS } from '../../src/shared/constants/permissions';
import { API_BASE, buildTestApp } from '../helpers/app';
import { testContextHeader } from '../helpers/fakes';

const ADMIN = testContextHeader('tenant-a', [PERMISSIONS.admin]);

describe('servers routes', () => {
  it('creates a server with defaults and lists it', async () => {
    const { app } = buildTestApp();
    const created = await request(app)
      .post(`${API_BASE}/servers`)
      .set('x-test-context', ADMIN)
      .send({ name: 'Production WHM', hostname: 'srv.example.com' });

    expect(created.status).toBe(201);
    expect(created.body.id).toBeTruthy();
    expect(created.body.port).toBe(2087);
    expect(created.body.status).toBe('INACTIVE');

    const list = await request(app).get(`${API_BASE}/servers`).set('x-test-context', ADMIN);
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(1);
    expect(list.body.items[0].name).toBe('Production WHM');
  });

  it('returns 409 on a duplicate name', async () => {
    const { app } = buildTestApp();
    const body = { name: 'Dup', hostname: 'a.example.com' };
    await request(app).post(`${API_BASE}/servers`).set('x-test-context', ADMIN).send(body);
    const second = await request(app)
      .post(`${API_BASE}/servers`)
      .set('x-test-context', ADMIN)
      .send(body);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('CONFLICT');
  });

  it('returns 404 for an unknown server', async () => {
    const { app } = buildTestApp();
    const res = await request(app).get(`${API_BASE}/servers/nope`).set('x-test-context', ADMIN);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects an invalid body with 422', async () => {
    const { app } = buildTestApp();
    const res = await request(app)
      .post(`${API_BASE}/servers`)
      .set('x-test-context', ADMIN)
      .send({ name: '', hostname: 'h' });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  it('writes an audit record on create', async () => {
    const { app, audit } = buildTestApp();
    await request(app)
      .post(`${API_BASE}/servers`)
      .set('x-test-context', ADMIN)
      .send({ name: 'Audited', hostname: 'a.example.com' });
    expect(audit.records.some((r) => r.action === 'server.create')).toBe(true);
  });

  it('test-connection returns ACTIVE when a WHM token is configured', async () => {
    const { app } = buildTestApp();
    const server = await request(app)
      .post(`${API_BASE}/servers`)
      .set('x-test-context', ADMIN)
      .send({ name: 'WHM1', hostname: 'whm.example.com' });
    await request(app)
      .post(`${API_BASE}/servers/${server.body.id}/tokens`)
      .set('x-test-context', ADMIN)
      .send({ label: 'root', whmUser: 'root', token: 'a-very-real-token' });

    const res = await request(app)
      .post(`${API_BASE}/servers/${server.body.id}/test-connection`)
      .set('x-test-context', ADMIN);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.status).toBe('ACTIVE');
    expect(res.body.whmVersion).toBe('11.110.0.5');
  });

  it('test-connection fails clearly when no token is configured', async () => {
    const { app } = buildTestApp();
    const server = await request(app)
      .post(`${API_BASE}/servers`)
      .set('x-test-context', ADMIN)
      .send({ name: 'NoToken', hostname: 'x.example.com' });
    const res = await request(app)
      .post(`${API_BASE}/servers/${server.body.id}/test-connection`)
      .set('x-test-context', ADMIN);
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });
});
