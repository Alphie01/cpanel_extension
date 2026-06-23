/* In-memory test doubles implementing the repository/audit interfaces so the
 * full HTTP stack can be exercised without a database. Tenant scoping is honored
 * exactly as the Prisma repositories enforce it. */
import type { Request } from 'express';
import type { ServerStatus } from '../../src/shared/types/server.types';
import type { TokenScope } from '../../src/shared/types/token.types';
import type { AccountRow, ServerRow, TokenRow } from '../../src/backend/repositories/hosting-prisma';
import type {
  AccountListFilter,
  AccountsRepository,
} from '../../src/backend/repositories/accounts.repository';
import type {
  CreateServerData,
  ServerListFilter,
  ServersRepository,
  UpdateServerData,
} from '../../src/backend/repositories/servers.repository';
import type {
  CreateTokenData,
  TokensRepository,
  UpdateTokenData,
} from '../../src/backend/repositories/tokens.repository';
import type { ParsedWhmAccount } from '../../src/backend/utils/whm-account-parse';
import type { AuditRecord, AuditSink } from '../../src/backend/utils/audit';
import { EXTENSION_SLUG, type TenantContext, type TenantContextProvider } from '../../src/backend/context/tenant-context.types';
import { Errors } from '../../src/backend/utils/errors';

let idSeq = 0;
const nextId = (prefix: string): string => `${prefix}_${++idSeq}`;

export class InMemoryServersRepository implements ServersRepository {
  rows: ServerRow[] = [];

  private live(tenantId: string): ServerRow[] {
    return this.rows.filter((r) => r.tenantId === tenantId && r.deletedAt === null);
  }

  async list(tenantId: string, filter: ServerListFilter): Promise<{ rows: ServerRow[]; total: number }> {
    let items = this.live(tenantId);
    if (filter.status) items = items.filter((r) => r.status === filter.status);
    if (filter.search) {
      const s = filter.search.toLowerCase();
      items = items.filter(
        (r) => r.name.toLowerCase().includes(s) || r.hostname.toLowerCase().includes(s),
      );
    }
    return { rows: items.slice(filter.skip, filter.skip + filter.take), total: items.length };
  }

  async findById(tenantId: string, id: string): Promise<ServerRow | null> {
    return this.live(tenantId).find((r) => r.id === id) ?? null;
  }

  async findByName(tenantId: string, name: string): Promise<ServerRow | null> {
    return this.live(tenantId).find((r) => r.name === name) ?? null;
  }

  async create(data: CreateServerData): Promise<ServerRow> {
    const now = new Date();
    const row: ServerRow = {
      id: nextId('srv'),
      tenantId: data.tenantId,
      name: data.name,
      hostname: data.hostname,
      port: data.port,
      status: 'INACTIVE',
      verifySsl: data.verifySsl,
      lastCheckedAt: null,
      lastError: null,
      notes: data.notes ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.rows.push(row);
    return row;
  }

  async update(tenantId: string, id: string, data: UpdateServerData): Promise<ServerRow | null> {
    const row = await this.findById(tenantId, id);
    if (!row) return null;
    if (data.name !== undefined) row.name = data.name;
    if (data.hostname !== undefined) row.hostname = data.hostname;
    if (data.port !== undefined) row.port = data.port;
    if (data.verifySsl !== undefined) row.verifySsl = data.verifySsl;
    if (data.notes !== undefined) row.notes = data.notes;
    row.updatedAt = new Date();
    return row;
  }

  async setStatus(
    tenantId: string,
    id: string,
    status: ServerStatus,
    lastError: string | null,
    checkedAt: Date,
  ): Promise<ServerRow | null> {
    const row = await this.findById(tenantId, id);
    if (!row) return null;
    row.status = status;
    row.lastError = lastError;
    row.lastCheckedAt = checkedAt;
    return row;
  }

  async softDelete(tenantId: string, id: string): Promise<boolean> {
    const row = await this.findById(tenantId, id);
    if (!row) return false;
    row.deletedAt = new Date();
    return true;
  }
}

export class InMemoryTokensRepository implements TokensRepository {
  rows: TokenRow[] = [];

  private live(tenantId: string): TokenRow[] {
    return this.rows.filter((r) => r.tenantId === tenantId && r.deletedAt === null);
  }

  async listForServer(tenantId: string, serverId: string): Promise<TokenRow[]> {
    return this.live(tenantId).filter((r) => r.serverId === serverId);
  }

  async findById(tenantId: string, id: string): Promise<TokenRow | null> {
    return this.live(tenantId).find((r) => r.id === id) ?? null;
  }

  async findByLabel(tenantId: string, serverId: string, label: string): Promise<TokenRow | null> {
    return this.live(tenantId).find((r) => r.serverId === serverId && r.label === label) ?? null;
  }

  async findActiveForServer(
    tenantId: string,
    serverId: string,
    scope: TokenScope,
  ): Promise<TokenRow | null> {
    return (
      this.live(tenantId).find(
        (r) => r.serverId === serverId && r.scope === scope && r.isActive,
      ) ?? null
    );
  }

  async countActiveByServerIds(tenantId: string, serverIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    for (const r of this.live(tenantId)) {
      if (r.isActive && serverIds.includes(r.serverId)) {
        counts.set(r.serverId, (counts.get(r.serverId) ?? 0) + 1);
      }
    }
    return counts;
  }

  async create(data: CreateTokenData): Promise<TokenRow> {
    const now = new Date();
    const row: TokenRow = {
      id: nextId('tok'),
      tenantId: data.tenantId,
      serverId: data.serverId,
      label: data.label,
      scope: data.scope,
      whmUser: data.whmUser,
      cpanelUser: data.cpanelUser ?? null,
      tokenEnc: data.tokenEnc,
      keyId: data.keyId,
      lastFour: data.lastFour,
      isActive: true,
      lastUsedAt: null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.rows.push(row);
    return row;
  }

  async update(tenantId: string, id: string, data: UpdateTokenData): Promise<TokenRow | null> {
    const row = await this.findById(tenantId, id);
    if (!row) return null;
    if (data.label !== undefined) row.label = data.label;
    if (data.isActive !== undefined) row.isActive = data.isActive;
    if (data.tokenEnc !== undefined) row.tokenEnc = data.tokenEnc;
    if (data.keyId !== undefined) row.keyId = data.keyId;
    if (data.lastFour !== undefined) row.lastFour = data.lastFour;
    row.updatedAt = new Date();
    return row;
  }

  async softDelete(tenantId: string, id: string): Promise<boolean> {
    const row = await this.findById(tenantId, id);
    if (!row) return false;
    row.deletedAt = new Date();
    row.isActive = false;
    return true;
  }

  async markUsed(tenantId: string, id: string, at: Date): Promise<void> {
    const row = await this.findById(tenantId, id);
    if (row) row.lastUsedAt = at;
  }
}

export class InMemoryAccountsRepository implements AccountsRepository {
  rows: AccountRow[] = [];

  private live(tenantId: string): AccountRow[] {
    return this.rows.filter((r) => r.tenantId === tenantId && r.deletedAt === null);
  }

  async list(tenantId: string, filter: AccountListFilter): Promise<{ rows: AccountRow[]; total: number }> {
    let items = this.live(tenantId);
    if (filter.serverId) items = items.filter((r) => r.serverId === filter.serverId);
    if (filter.suspended !== undefined) items = items.filter((r) => r.suspended === filter.suspended);
    if (filter.search) {
      const s = filter.search.toLowerCase();
      items = items.filter(
        (r) => r.cpanelUser.toLowerCase().includes(s) || (r.domain ?? '').toLowerCase().includes(s),
      );
    }
    return { rows: items.slice(filter.skip, filter.skip + filter.take), total: items.length };
  }

  async findById(tenantId: string, id: string): Promise<AccountRow | null> {
    return this.live(tenantId).find((r) => r.id === id) ?? null;
  }

  async findByUser(tenantId: string, serverId: string, cpanelUser: string): Promise<AccountRow | null> {
    return this.live(tenantId).find((r) => r.serverId === serverId && r.cpanelUser === cpanelUser) ?? null;
  }

  async upsertOne(
    tenantId: string,
    serverId: string,
    account: ParsedWhmAccount,
    syncedAt: Date,
  ): Promise<AccountRow> {
    const existing = await this.findByUser(tenantId, serverId, account.cpanelUser);
    if (existing) {
      existing.domain = account.domain;
      existing.plan = account.plan;
      existing.suspended = account.suspended;
      existing.rawJson = account.raw;
      existing.lastSyncedAt = syncedAt;
      existing.updatedAt = new Date();
      return existing;
    }
    const now = new Date();
    const row: AccountRow = {
      id: nextId('acc'),
      tenantId,
      serverId,
      cpanelUser: account.cpanelUser,
      domain: account.domain,
      plan: account.plan,
      suspended: account.suspended,
      rawJson: account.raw,
      lastSyncedAt: syncedAt,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    this.rows.push(row);
    return row;
  }

  async upsertMany(
    tenantId: string,
    serverId: string,
    accounts: ParsedWhmAccount[],
    syncedAt: Date,
  ): Promise<number> {
    for (const account of accounts) await this.upsertOne(tenantId, serverId, account, syncedAt);
    return accounts.length;
  }
}

export class InMemoryAuditSink implements AuditSink {
  records: AuditRecord[] = [];
  async record(entry: AuditRecord): Promise<void> {
    this.records.push(entry);
  }
}

/** Resolves context from an `x-test-context` JSON header so each request can act
 *  as a different tenant/permission set. */
export class TestContextProvider implements TenantContextProvider {
  async resolve(req: Request): Promise<TenantContext> {
    const raw = req.headers['x-test-context'];
    if (typeof raw !== 'string') {
      throw Errors.tenantContextMissing('No x-test-context header.');
    }
    const parsed = JSON.parse(raw) as {
      tenantId: string;
      userId?: string;
      permissions?: string[];
    };
    return {
      tenantId: parsed.tenantId,
      userId: parsed.userId ?? null,
      permissions: parsed.permissions ?? [],
      extensionSlug: EXTENSION_SLUG,
      requestId: req.requestId ?? 'test',
    };
  }
}

export function testContextHeader(tenantId: string, permissions: string[], userId = 'user-1'): string {
  return JSON.stringify({ tenantId, userId, permissions });
}
