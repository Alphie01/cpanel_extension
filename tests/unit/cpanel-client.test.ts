import { describe, expect, it } from 'vitest';
import { createCpanelApiClient } from '../../src/backend/services/cpanel-api.client';
import type { WhmApiClient, WhmCredentials } from '../../src/backend/services/whm-api.client';

const CREDS: WhmCredentials = { hostname: 'h', port: 2087, user: 'root', token: 't', verifySsl: true };

interface RecordedCall {
  fn: string;
  params: Record<string, string> | undefined;
}

function makeWhm(
  responder: (fn: string, params?: Record<string, string>) => unknown,
): { whm: WhmApiClient; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const whm: WhmApiClient = {
    testConnection: async () => ({ version: null }),
    listAccounts: async () => [],
    accountSummary: async () => null,
    call: async (_creds, fn, params) => {
      calls.push({ fn, params });
      return responder(fn, params) as never;
    },
  };
  return { whm, calls };
}

describe('cPanel API client (via WHM proxy)', () => {
  it('lists email accounts and maps disk fields', async () => {
    const { whm, calls } = makeWhm(() => ({
      result: {
        status: 1,
        errors: null,
        messages: null,
        data: [{ email: 'info@acct.com', diskquota: '250', diskused: '10' }],
      },
    }));
    const cpanel = createCpanelApiClient(whm);

    const emails = await cpanel.listEmailAccounts(CREDS, 'acct');

    expect(emails).toEqual([{ email: 'info@acct.com', quotaMb: 250, usedMb: 10, suspended: false }]);
    expect(calls[0]!.fn).toBe('cpanel');
    expect(calls[0]!.params?.cpanel_jsonapi_module).toBe('Email');
    expect(calls[0]!.params?.cpanel_jsonapi_func).toBe('list_pops_with_disk');
    expect(calls[0]!.params?.cpanel_jsonapi_user).toBe('acct');
  });

  it('maps a failed UAPI status to CPANEL_API_ERROR', async () => {
    const { whm } = makeWhm(() => ({
      result: { status: 0, errors: ['Mailbox already exists'], messages: null, data: null },
    }));
    const cpanel = createCpanelApiClient(whm);
    await expect(cpanel.listEmailAccounts(CREDS, 'acct')).rejects.toMatchObject({
      code: 'CPANEL_API_ERROR',
    });
  });

  it('sends add_pop with the right params on create', async () => {
    const { whm, calls } = makeWhm(() => ({ result: { status: 1, errors: null, messages: null, data: {} } }));
    const cpanel = createCpanelApiClient(whm);
    await cpanel.createEmailAccount(CREDS, 'acct', {
      user: 'sales',
      domain: 'acct.com',
      password: 'StrongPass1',
      quotaMb: 500,
    });
    expect(calls[0]!.params?.cpanel_jsonapi_func).toBe('add_pop');
    expect(calls[0]!.params?.email).toBe('sales');
    expect(calls[0]!.params?.domain).toBe('acct.com');
    expect(calls[0]!.params?.quota).toBe('500');
  });

  it('maps DomainInfo::list_domains into grouped domains', async () => {
    const { whm } = makeWhm(() => ({
      result: {
        status: 1,
        errors: null,
        messages: null,
        data: {
          main_domain: 'm.com',
          addon_domains: ['a.com'],
          sub_domains: ['s.m.com'],
          parked_domains: [],
        },
      },
    }));
    const cpanel = createCpanelApiClient(whm);
    const groups = await cpanel.listDomains(CREDS, 'acct');
    expect(groups).toEqual({ main: 'm.com', addon: ['a.com'], sub: ['s.m.com'], parked: [] });
  });

  it('maps Mysql::list_databases (disk_usage bytes -> MB)', async () => {
    const { whm } = makeWhm(() => ({
      result: {
        status: 1,
        errors: null,
        messages: null,
        data: [{ database: 'db', users: ['u'], disk_usage: 2_097_152 }],
      },
    }));
    const cpanel = createCpanelApiClient(whm);
    const dbs = await cpanel.listDatabases(CREDS, 'acct');
    expect(dbs).toEqual([{ name: 'db', users: ['u'], sizeMb: 2 }]);
  });
});
