import { describe, expect, it } from 'vitest';
import {
  createWhmApiClient,
  HttpTransportError,
  type HttpClient,
  type HttpRequest,
  type HttpResponse,
  type WhmCredentials,
} from '../../src/backend/services/whm-api.client';

const CREDS: WhmCredentials = {
  hostname: 'srv.example.com',
  port: 2087,
  user: 'root',
  token: 'SUPER_SECRET_TOKEN',
  verifySsl: true,
};

function makeHttp(
  responder: (req: HttpRequest, callIndex: number) => Promise<HttpResponse>,
): { http: HttpClient; calls: HttpRequest[] } {
  const calls: HttpRequest[] = [];
  const http: HttpClient = {
    request: async (req) => {
      calls.push(req);
      return responder(req, calls.length);
    },
  };
  return { http, calls };
}

const config = { timeoutMs: 50, maxRetries: 1, baseBackoffMs: 0 };

describe('WHM API client', () => {
  it('parses version on success and sends the whm auth header', async () => {
    const { http, calls } = makeHttp(async () => ({
      status: 200,
      body: JSON.stringify({ metadata: { result: 1 }, data: { version: '11.110.0.5' } }),
    }));
    const client = createWhmApiClient(config, http);

    const res = await client.testConnection(CREDS);

    expect(res.version).toBe('11.110.0.5');
    expect(calls[0]!.headers.Authorization).toBe('whm root:SUPER_SECRET_TOKEN');
    expect(calls[0]!.url).toContain('/json-api/version');
    expect(calls[0]!.rejectUnauthorized).toBe(true);
  });

  it('maps 401 to WHM_AUTH_FAILED', async () => {
    const { http } = makeHttp(async () => ({ status: 401, body: 'denied' }));
    const client = createWhmApiClient(config, http);
    await expect(client.testConnection(CREDS)).rejects.toMatchObject({ code: 'WHM_AUTH_FAILED' });
  });

  it('maps transport timeout to WHM_UNREACHABLE and never leaks the token', async () => {
    const { http } = makeHttp(async () => {
      throw new HttpTransportError('TIMEOUT', 'timed out');
    });
    const client = createWhmApiClient(config, http);
    const err = await client.testConnection(CREDS).catch((e: unknown) => e);
    expect(err).toMatchObject({ code: 'WHM_UNREACHABLE' });
    expect((err as Error).message).not.toContain('SUPER_SECRET_TOKEN');
  });

  it('maps a sustained 429 to RATE_LIMITED', async () => {
    const { http } = makeHttp(async () => ({ status: 429, body: '' }));
    const client = createWhmApiClient(config, http);
    await expect(client.testConnection(CREDS)).rejects.toMatchObject({ code: 'RATE_LIMITED' });
  });

  it('treats metadata.result=0 as a failure', async () => {
    const { http } = makeHttp(async () => ({
      status: 200,
      body: JSON.stringify({ metadata: { result: 0, reason: 'Access denied for token' } }),
    }));
    const client = createWhmApiClient(config, http);
    await expect(client.testConnection(CREDS)).rejects.toMatchObject({ code: 'WHM_AUTH_FAILED' });
  });

  it('honors verifySsl=false (rejectUnauthorized false)', async () => {
    const { http, calls } = makeHttp(async () => ({
      status: 200,
      body: JSON.stringify({ metadata: { result: 1 }, data: { version: '11' } }),
    }));
    const client = createWhmApiClient(config, http);
    await client.testConnection({ ...CREDS, verifySsl: false });
    expect(calls[0]!.rejectUnauthorized).toBe(false);
  });
});
