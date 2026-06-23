/* cPanel UAPI client. Calls cPanel UAPI through the WHM `cpanel` proxy so a
 * single WHM token can operate on any account on the server — no per-account
 * cPanel token required:
 *   /json-api/cpanel?cpanel_jsonapi_apiversion=3&cpanel_jsonapi_user=USER
 *     &cpanel_jsonapi_module=Email&cpanel_jsonapi_func=...
 * The inner UAPI `result.status` drives success/failure mapping. Passwords pass
 * through as parameters only and are never logged. */
import { ExtErrorCode } from '../../shared/constants/error-codes';
import type { CreateEmailInput } from '../../shared/schemas/email.schema';
import type { DatabaseDto } from '../../shared/types/database.types';
import type { EmailAccountDto } from '../../shared/types/email.types';
import { ExtensionError } from '../utils/errors';
import { parseBoolish, parseMb } from '../utils/whm-account-parse';
import type { WhmApiClient, WhmCredentials } from './whm-api.client';

interface UapiResult<T> {
  data: T;
  status: number;
  errors: string[] | null;
  messages: string[] | null;
}

export interface DomainGroups {
  main: string | null;
  addon: string[];
  sub: string[];
  parked: string[];
}

export interface CpanelApiClient {
  // Email
  listEmailAccounts(creds: WhmCredentials, user: string): Promise<EmailAccountDto[]>;
  createEmailAccount(creds: WhmCredentials, user: string, input: CreateEmailInput): Promise<void>;
  deleteEmailAccount(creds: WhmCredentials, user: string, email: string): Promise<void>;
  setEmailPassword(creds: WhmCredentials, user: string, email: string, password: string): Promise<void>;
  setEmailQuota(creds: WhmCredentials, user: string, email: string, quotaMb: number): Promise<void>;
  setEmailSuspended(creds: WhmCredentials, user: string, email: string, suspended: boolean): Promise<void>;
  // Domains
  listDomains(creds: WhmCredentials, user: string): Promise<DomainGroups>;
  listSslDomains(creds: WhmCredentials, user: string): Promise<string[]>;
  triggerAutoSsl(creds: WhmCredentials, user: string): Promise<void>;
  // Databases (MySQL)
  listDatabases(creds: WhmCredentials, user: string): Promise<DatabaseDto[]>;
  listDatabaseUsers(creds: WhmCredentials, user: string): Promise<string[]>;
  createDatabase(creds: WhmCredentials, user: string, name: string): Promise<void>;
  createDatabaseUser(creds: WhmCredentials, user: string, name: string, password: string): Promise<void>;
  assignDatabaseUser(
    creds: WhmCredentials,
    user: string,
    dbUser: string,
    database: string,
    privileges: string,
  ): Promise<void>;
  deleteDatabase(creds: WhmCredentials, user: string, name: string): Promise<void>;
  deleteDatabaseUser(creds: WhmCredentials, user: string, name: string): Promise<void>;
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => str(v) ?? str((v as Record<string, unknown>)?.user)).filter((v): v is string => v !== null);
}

function bytesToMb(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) ? Math.round(n / (1024 * 1024)) : null;
}

function toEmailDto(raw: unknown): EmailAccountDto {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    email: str(r.email) ?? str(r.login) ?? 'unknown',
    quotaMb: parseMb(r.diskquota ?? r._diskquota),
    usedMb: parseMb(r.diskused ?? r._diskused),
    suspended: parseBoolish(r.suspended_login ?? r.suspended_incoming),
  };
}

function toDatabaseDto(raw: unknown): DatabaseDto {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    name: str(r.database) ?? str(r.name) ?? 'unknown',
    users: asStringArray(r.users),
    sizeMb: bytesToMb(r.disk_usage ?? r.size),
  };
}

export function createCpanelApiClient(whm: WhmApiClient): CpanelApiClient {
  async function uapi<T>(
    creds: WhmCredentials,
    user: string,
    moduleName: string,
    func: string,
    params: Record<string, string> = {},
  ): Promise<T> {
    const wrapped = await whm.call<{ result?: UapiResult<T> }>(creds, 'cpanel', {
      cpanel_jsonapi_apiversion: '3',
      cpanel_jsonapi_user: user,
      cpanel_jsonapi_module: moduleName,
      cpanel_jsonapi_func: func,
      ...params,
    });
    const result = wrapped.result;
    if (!result || result.status !== 1) {
      const reason = result?.errors?.filter(Boolean).join('; ') || 'cPanel operation failed.';
      throw new ExtensionError(
        ExtErrorCode.CPANEL_API_ERROR,
        `cPanel ${moduleName}::${func} failed: ${reason}`,
        502,
      );
    }
    return result.data;
  }

  return {
    // ── Email ────────────────────────────────────────────────────────────
    async listEmailAccounts(creds, user): Promise<EmailAccountDto[]> {
      const data = await uapi<unknown>(creds, user, 'Email', 'list_pops_with_disk');
      return (Array.isArray(data) ? data : []).map(toEmailDto);
    },
    async createEmailAccount(creds, user, input): Promise<void> {
      await uapi(creds, user, 'Email', 'add_pop', {
        email: input.user,
        domain: input.domain,
        password: input.password,
        quota: String(input.quotaMb),
      });
    },
    async deleteEmailAccount(creds, user, email): Promise<void> {
      await uapi(creds, user, 'Email', 'delete_pop', { email });
    },
    async setEmailPassword(creds, user, email, password): Promise<void> {
      await uapi(creds, user, 'Email', 'passwd_pop', { email, password });
    },
    async setEmailQuota(creds, user, email, quotaMb): Promise<void> {
      await uapi(creds, user, 'Email', 'edit_pop_quota', { email, quota: String(quotaMb) });
    },
    async setEmailSuspended(creds, user, email, suspended): Promise<void> {
      await uapi(creds, user, 'Email', suspended ? 'suspend_login' : 'unsuspend_login', { email });
    },

    // ── Domains ──────────────────────────────────────────────────────────
    async listDomains(creds, user): Promise<DomainGroups> {
      const data = await uapi<Record<string, unknown>>(creds, user, 'DomainInfo', 'list_domains');
      return {
        main: str(data.main_domain),
        addon: asStringArray(data.addon_domains),
        sub: asStringArray(data.sub_domains),
        parked: asStringArray(data.parked_domains),
      };
    },
    async listSslDomains(creds, user): Promise<string[]> {
      const data = await uapi<unknown>(creds, user, 'SSL', 'installed_hosts');
      const hosts = Array.isArray(data) ? data : [];
      const domains = new Set<string>();
      for (const host of hosts) {
        const h = (host && typeof host === 'object' ? host : {}) as Record<string, unknown>;
        for (const d of asStringArray(h.domains)) domains.add(d);
        const sn = str(h.servername);
        if (sn) domains.add(sn);
      }
      return [...domains];
    },
    async triggerAutoSsl(creds, user): Promise<void> {
      await uapi(creds, user, 'SSL', 'start_autossl_check');
    },

    // ── Databases (MySQL) ────────────────────────────────────────────────
    async listDatabases(creds, user): Promise<DatabaseDto[]> {
      const data = await uapi<unknown>(creds, user, 'Mysql', 'list_databases');
      return (Array.isArray(data) ? data : []).map(toDatabaseDto);
    },
    async listDatabaseUsers(creds, user): Promise<string[]> {
      const data = await uapi<unknown>(creds, user, 'Mysql', 'list_users');
      return asStringArray(data);
    },
    async createDatabase(creds, user, name): Promise<void> {
      await uapi(creds, user, 'Mysql', 'create_database', { name });
    },
    async createDatabaseUser(creds, user, name, password): Promise<void> {
      await uapi(creds, user, 'Mysql', 'create_user', { name, password });
    },
    async assignDatabaseUser(creds, user, dbUser, database, privileges): Promise<void> {
      await uapi(creds, user, 'Mysql', 'set_privileges_on_database', {
        user: dbUser,
        database,
        privileges,
      });
    },
    async deleteDatabase(creds, user, name): Promise<void> {
      await uapi(creds, user, 'Mysql', 'delete_database', { name });
    },
    async deleteDatabaseUser(creds, user, name): Promise<void> {
      await uapi(creds, user, 'Mysql', 'delete_user', { name });
    },
  };
}
