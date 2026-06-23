/* Narrow structural view of the Prisma client — only the delegates/methods this
 * extension uses. Repositories depend on THIS, not the generated client, so the
 * codebase typechecks independently of `prisma generate`; container.ts casts the
 * real PrismaClient to this shape at the single wiring point. Row types reflect
 * the DB columns we read/write. */
import type { ServerStatus } from '../../shared/types/server.types';
import type { TokenScope } from '../../shared/types/token.types';

export interface ServerRow {
  id: string;
  tenantId: string;
  name: string;
  hostname: string;
  port: number;
  status: ServerStatus;
  verifySsl: boolean;
  lastCheckedAt: Date | null;
  lastError: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface TokenRow {
  id: string;
  tenantId: string;
  serverId: string;
  label: string;
  scope: TokenScope;
  whmUser: string;
  cpanelUser: string | null;
  tokenEnc: string;
  keyId: string;
  lastFour: string | null;
  isActive: boolean;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

type Where = Record<string, unknown>;
type Data = Record<string, unknown>;

export interface ServerDelegate {
  findMany(args: { where: Where; orderBy?: Where; skip?: number; take?: number }): Promise<ServerRow[]>;
  count(args: { where: Where }): Promise<number>;
  findFirst(args: { where: Where }): Promise<ServerRow | null>;
  create(args: { data: Data }): Promise<ServerRow>;
  // updateMany keeps tenantId in the WHERE (tenant-safe); single update only
  // accepts a unique where, so we never expose it at the repository boundary.
  updateMany(args: { where: Where; data: Data }): Promise<{ count: number }>;
}

export interface TokenDelegate {
  findMany(args: { where: Where; orderBy?: Where }): Promise<TokenRow[]>;
  findFirst(args: { where: Where }): Promise<TokenRow | null>;
  create(args: { data: Data }): Promise<TokenRow>;
  updateMany(args: { where: Where; data: Data }): Promise<{ count: number }>;
  groupBy(args: {
    by: ['serverId'];
    where: Where;
    _count: { _all: true };
  }): Promise<Array<{ serverId: string; _count: { _all: number } }>>;
}

export interface AccountRow {
  id: string;
  tenantId: string;
  serverId: string;
  cpanelUser: string;
  domain: string | null;
  plan: string | null;
  suspended: boolean;
  rawJson: unknown;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface AccountDelegate {
  findMany(args: { where: Where; orderBy?: Where; skip?: number; take?: number }): Promise<AccountRow[]>;
  count(args: { where: Where }): Promise<number>;
  findFirst(args: { where: Where }): Promise<AccountRow | null>;
  create(args: { data: Data }): Promise<AccountRow>;
  updateMany(args: { where: Where; data: Data }): Promise<{ count: number }>;
}

export interface OperationLogDelegate {
  create(args: { data: Data }): Promise<unknown>;
}

export interface HostingPrismaClient {
  extHostingServer: ServerDelegate;
  extHostingToken: TokenDelegate;
  extHostingAccount: AccountDelegate;
  extHostingOperationLog: OperationLogDelegate;
}
