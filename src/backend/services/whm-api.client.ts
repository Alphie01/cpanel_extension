/* WHM (whostmgr) JSON API v1 client.
 *
 *   GET https://{host}:{port}/json-api/{fn}?api.version=1&...params
 *   Authorization: whm {user}:{token}
 *
 * Concerns handled here: per-server SSL verification toggle, request timeout,
 * retry-with-backoff on transport/429/5xx, per-host concurrency limiting, and
 * mapping every failure mode to the standard error envelope. The raw token is
 * never placed in an error message or log. The HttpClient is injected so tests
 * run without real network/TLS. */
import { request as httpsRequest } from 'node:https';
import { ExtErrorCode } from '../../shared/constants/error-codes';
import { ExtensionError } from '../utils/errors';
import { KeyedConcurrencyLimiter, retry } from '../utils/http-retry';

export interface WhmCredentials {
  hostname: string;
  port: number;
  user: string;
  token: string;
  verifySsl: boolean;
}

export interface WhmClientConfig {
  timeoutMs: number;
  maxRetries: number;
  baseBackoffMs: number;
}

export interface WhmVersionInfo {
  version: string | null;
}

/** A raw WHM account record (listaccts/accountsummary `acct` entry). */
export type WhmRawAccount = Record<string, unknown>;

export interface HttpRequest {
  url: string;
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  timeoutMs: number;
  rejectUnauthorized: boolean;
}

export interface HttpResponse {
  status: number;
  body: string;
}

export interface HttpClient {
  request(req: HttpRequest): Promise<HttpResponse>;
}

export interface WhmApiClient {
  testConnection(creds: WhmCredentials): Promise<WhmVersionInfo>;
  listAccounts(creds: WhmCredentials): Promise<WhmRawAccount[]>;
  accountSummary(creds: WhmCredentials, user: string): Promise<WhmRawAccount | null>;
  call<T = unknown>(creds: WhmCredentials, fn: string, params?: Record<string, string>): Promise<T>;
}

// ─── Internal transport/retry signaling ─────────────────────────────────────
type TransportKind = 'TIMEOUT' | 'NETWORK';

export class HttpTransportError extends Error {
  constructor(public readonly kind: TransportKind, message: string) {
    super(message);
    this.name = 'HttpTransportError';
  }
}

type RetryableKind = 'TIMEOUT' | 'NETWORK' | 'RATE_LIMITED' | 'SERVER';

class RetryableError extends Error {
  constructor(public readonly kind: RetryableKind) {
    super(kind);
    this.name = 'RetryableError';
  }
}

interface WhmEnvelope {
  metadata?: { result?: number; reason?: string };
  data?: unknown;
}

// ─── Default Node HTTPS transport ───────────────────────────────────────────
export function createNodeHttpClient(): HttpClient {
  return {
    request(req: HttpRequest): Promise<HttpResponse> {
      return new Promise<HttpResponse>((resolve, reject) => {
        const url = new URL(req.url);
        const r = httpsRequest(
          {
            hostname: url.hostname,
            port: url.port,
            path: `${url.pathname}${url.search}`,
            method: req.method,
            headers: req.headers,
            rejectUnauthorized: req.rejectUnauthorized,
            timeout: req.timeoutMs,
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (c: Buffer) => chunks.push(c));
            res.on('end', () =>
              resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }),
            );
          },
        );
        r.on('timeout', () => {
          r.destroy(new HttpTransportError('TIMEOUT', 'Request timed out.'));
        });
        r.on('error', (err) => {
          reject(
            err instanceof HttpTransportError
              ? err
              : new HttpTransportError('NETWORK', 'Network error contacting host.'),
          );
        });
        r.end();
      });
    },
  };
}

export function createWhmApiClient(
  config: WhmClientConfig,
  http: HttpClient,
  limiter: KeyedConcurrencyLimiter = new KeyedConcurrencyLimiter(4),
): WhmApiClient {
  function buildUrl(creds: WhmCredentials, fn: string, params: Record<string, string>): string {
    const url = new URL(`https://${creds.hostname}:${creds.port}/json-api/${fn}`);
    url.searchParams.set('api.version', '1');
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    return url.toString();
  }

  async function call<T>(
    creds: WhmCredentials,
    fn: string,
    params: Record<string, string> = {},
  ): Promise<T> {
    const httpReq: HttpRequest = {
      url: buildUrl(creds, fn, params),
      method: 'GET',
      headers: {
        // The raw token lives only in this header for the lifetime of the call.
        Authorization: `whm ${creds.user}:${creds.token}`,
        Accept: 'application/json',
      },
      timeoutMs: config.timeoutMs,
      rejectUnauthorized: creds.verifySsl,
    };

    const attempt = async (): Promise<HttpResponse> => {
      let res: HttpResponse;
      try {
        res = await http.request(httpReq);
      } catch (err) {
        if (err instanceof HttpTransportError) throw new RetryableError(err.kind);
        throw err;
      }
      if (res.status === 429) throw new RetryableError('RATE_LIMITED');
      if (res.status >= 500) throw new RetryableError('SERVER');
      return res;
    };

    let res: HttpResponse;
    try {
      res = await limiter.run(creds.hostname, () =>
        retry(attempt, {
          retries: config.maxRetries,
          baseBackoffMs: config.baseBackoffMs,
          isRetryable: (e) => e instanceof RetryableError,
        }),
      );
    } catch (err) {
      throw mapRetryFailure(err);
    }

    if (res.status === 401 || res.status === 403) {
      throw new ExtensionError(ExtErrorCode.WHM_AUTH_FAILED, 'WHM authentication failed.', 502);
    }
    if (res.status >= 400) {
      throw new ExtensionError(
        ExtErrorCode.WHM_API_ERROR,
        `WHM API returned status ${res.status}.`,
        502,
      );
    }

    let parsed: WhmEnvelope;
    try {
      parsed = JSON.parse(res.body) as WhmEnvelope;
    } catch {
      throw new ExtensionError(ExtErrorCode.WHM_API_ERROR, 'WHM API returned an unparseable response.', 502);
    }

    const result = parsed.metadata?.result;
    if (result !== undefined && result !== 1) {
      // WHM signals failure via metadata.result=0 with a (non-secret) reason.
      const reason = parsed.metadata?.reason ?? 'Unknown WHM error.';
      const code = /access denied|permission|token/i.test(reason)
        ? ExtErrorCode.WHM_AUTH_FAILED
        : ExtErrorCode.WHM_API_ERROR;
      throw new ExtensionError(code, `WHM API error: ${reason}`, 502);
    }

    return (parsed.data ?? parsed) as T;
  }

  return {
    call,

    async testConnection(creds: WhmCredentials): Promise<WhmVersionInfo> {
      const data = await call<{ version?: string }>(creds, 'version');
      return { version: typeof data.version === 'string' ? data.version : null };
    },

    async listAccounts(creds: WhmCredentials): Promise<WhmRawAccount[]> {
      const data = await call<{ acct?: unknown[] }>(creds, 'listaccts');
      return Array.isArray(data.acct) ? (data.acct as WhmRawAccount[]) : [];
    },

    async accountSummary(creds: WhmCredentials, user: string): Promise<WhmRawAccount | null> {
      const data = await call<{ acct?: unknown[] }>(creds, 'accountsummary', { user });
      const first = Array.isArray(data.acct) ? data.acct[0] : null;
      return (first ?? null) as WhmRawAccount | null;
    },
  };
}

function mapRetryFailure(err: unknown): ExtensionError {
  if (err instanceof RetryableError) {
    switch (err.kind) {
      case 'RATE_LIMITED':
        return new ExtensionError(ExtErrorCode.RATE_LIMITED, 'WHM API rate limit reached.', 429);
      case 'TIMEOUT':
      case 'NETWORK':
        return new ExtensionError(ExtErrorCode.WHM_UNREACHABLE, 'WHM server is unreachable.', 502);
      case 'SERVER':
        return new ExtensionError(ExtErrorCode.WHM_API_ERROR, 'WHM server returned an error.', 502);
    }
  }
  if (err instanceof ExtensionError) return err;
  return new ExtensionError(ExtErrorCode.WHM_API_ERROR, 'Unexpected WHM API failure.', 502);
}
