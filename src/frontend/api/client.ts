/* Frontend API client. No hardcoded tenant: the host session (cookies/headers)
 * carries identity; we never send a tenantId. The base origin is host-injected
 * (defaults to same-origin) so nothing is hardcoded to one environment. */
import type { ErrorEnvelope } from '../../shared/types/common.types';

const API_PREFIX = '/api/extensions/cpanel-whm-manager';

interface HostWindow extends Window {
  __RELATION_API_BASE__?: string;
}

function baseUrl(): string {
  const host = window as HostWindow;
  return `${host.__RELATION_API_BASE__ ?? ''}${API_PREFIX}`;
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    credentials: 'include',
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const text = await res.text();
  const body: unknown = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const env = body as ErrorEnvelope | undefined;
    throw new ApiError(
      env?.error?.code ?? 'INTERNAL',
      env?.error?.message ?? 'Request failed.',
      res.status,
      env?.error?.details,
    );
  }
  return body as T;
}

export const api = {
  get: <T>(path: string): Promise<T> => apiFetch<T>(path),
  post: <T>(path: string, body: unknown): Promise<T> =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown): Promise<T> =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  del: (path: string): Promise<void> => apiFetch<void>(path, { method: 'DELETE' }),
};
