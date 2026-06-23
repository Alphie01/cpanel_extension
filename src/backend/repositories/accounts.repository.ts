/* Account cache persistence. Prisma access only, every query tenant-scoped.
 * Accounts mirror WHM `listaccts`/`accountsummary`; the raw payload is kept in
 * rawJson and metrics are derived at the DTO boundary. */
import type { ParsedWhmAccount } from '../utils/whm-account-parse';
import type { AccountRow, HostingPrismaClient } from './hosting-prisma';

export interface AccountListFilter {
  serverId?: string;
  search?: string;
  suspended?: boolean;
  skip: number;
  take: number;
}

export interface AccountsRepository {
  list(tenantId: string, filter: AccountListFilter): Promise<{ rows: AccountRow[]; total: number }>;
  findById(tenantId: string, id: string): Promise<AccountRow | null>;
  findByUser(tenantId: string, serverId: string, cpanelUser: string): Promise<AccountRow | null>;
  upsertOne(
    tenantId: string,
    serverId: string,
    account: ParsedWhmAccount,
    syncedAt: Date,
  ): Promise<AccountRow>;
  upsertMany(
    tenantId: string,
    serverId: string,
    accounts: ParsedWhmAccount[],
    syncedAt: Date,
  ): Promise<number>;
}

export class PrismaAccountsRepository implements AccountsRepository {
  constructor(private readonly prisma: HostingPrismaClient) {}

  async list(
    tenantId: string,
    filter: AccountListFilter,
  ): Promise<{ rows: AccountRow[]; total: number }> {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (filter.serverId) where.serverId = filter.serverId;
    if (filter.suspended !== undefined) where.suspended = filter.suspended;
    if (filter.search) {
      where.OR = [
        { cpanelUser: { contains: filter.search, mode: 'insensitive' } },
        { domain: { contains: filter.search, mode: 'insensitive' } },
      ];
    }
    const [rows, total] = await Promise.all([
      this.prisma.extHostingAccount.findMany({
        where,
        orderBy: { cpanelUser: 'asc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.extHostingAccount.count({ where }),
    ]);
    return { rows, total };
  }

  async findById(tenantId: string, id: string): Promise<AccountRow | null> {
    return this.prisma.extHostingAccount.findFirst({ where: { id, tenantId, deletedAt: null } });
  }

  async findByUser(tenantId: string, serverId: string, cpanelUser: string): Promise<AccountRow | null> {
    return this.prisma.extHostingAccount.findFirst({
      where: { tenantId, serverId, cpanelUser, deletedAt: null },
    });
  }

  async upsertOne(
    tenantId: string,
    serverId: string,
    account: ParsedWhmAccount,
    syncedAt: Date,
  ): Promise<AccountRow> {
    const existing = await this.findByUser(tenantId, serverId, account.cpanelUser);
    if (existing) {
      await this.prisma.extHostingAccount.updateMany({
        where: { id: existing.id, tenantId, deletedAt: null },
        data: {
          domain: account.domain,
          plan: account.plan,
          suspended: account.suspended,
          rawJson: account.raw,
          lastSyncedAt: syncedAt,
        },
      });
      const updated = await this.findById(tenantId, existing.id);
      return updated ?? existing;
    }
    return this.prisma.extHostingAccount.create({
      data: {
        tenantId,
        serverId,
        cpanelUser: account.cpanelUser,
        domain: account.domain,
        plan: account.plan,
        suspended: account.suspended,
        rawJson: account.raw,
        lastSyncedAt: syncedAt,
      },
    });
  }

  async upsertMany(
    tenantId: string,
    serverId: string,
    accounts: ParsedWhmAccount[],
    syncedAt: Date,
  ): Promise<number> {
    for (const account of accounts) {
      await this.upsertOne(tenantId, serverId, account, syncedAt);
    }
    return accounts.length;
  }
}
