/* Token persistence. Prisma access only, every query tenant-scoped. Stores the
 * already-encrypted token blob; never receives or returns plaintext. */
import type { TokenScope } from '../../shared/types/token.types';
import type { HostingPrismaClient, TokenRow } from './hosting-prisma';

export interface CreateTokenData {
  tenantId: string;
  serverId: string;
  label: string;
  scope: TokenScope;
  whmUser: string;
  cpanelUser?: string;
  tokenEnc: string;
  keyId: string;
  lastFour: string;
  createdById: string | null;
}

export interface UpdateTokenData {
  label?: string;
  isActive?: boolean;
  tokenEnc?: string;
  keyId?: string;
  lastFour?: string;
  updatedById: string | null;
}

export interface TokensRepository {
  listForServer(tenantId: string, serverId: string): Promise<TokenRow[]>;
  findById(tenantId: string, id: string): Promise<TokenRow | null>;
  findByLabel(tenantId: string, serverId: string, label: string): Promise<TokenRow | null>;
  findActiveForServer(tenantId: string, serverId: string, scope: TokenScope): Promise<TokenRow | null>;
  countActiveByServerIds(tenantId: string, serverIds: string[]): Promise<Map<string, number>>;
  create(data: CreateTokenData): Promise<TokenRow>;
  update(tenantId: string, id: string, data: UpdateTokenData): Promise<TokenRow | null>;
  softDelete(tenantId: string, id: string): Promise<boolean>;
  markUsed(tenantId: string, id: string, at: Date): Promise<void>;
}

export class PrismaTokensRepository implements TokensRepository {
  constructor(private readonly prisma: HostingPrismaClient) {}

  async listForServer(tenantId: string, serverId: string): Promise<TokenRow[]> {
    return this.prisma.extHostingToken.findMany({
      where: { tenantId, serverId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(tenantId: string, id: string): Promise<TokenRow | null> {
    return this.prisma.extHostingToken.findFirst({ where: { id, tenantId, deletedAt: null } });
  }

  async findByLabel(tenantId: string, serverId: string, label: string): Promise<TokenRow | null> {
    return this.prisma.extHostingToken.findFirst({
      where: { tenantId, serverId, label, deletedAt: null },
    });
  }

  async findActiveForServer(
    tenantId: string,
    serverId: string,
    scope: TokenScope,
  ): Promise<TokenRow | null> {
    return this.prisma.extHostingToken.findFirst({
      where: { tenantId, serverId, scope, isActive: true, deletedAt: null },
    });
  }

  async countActiveByServerIds(tenantId: string, serverIds: string[]): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    if (serverIds.length === 0) return counts;
    const grouped = await this.prisma.extHostingToken.groupBy({
      by: ['serverId'],
      where: { tenantId, serverId: { in: serverIds }, isActive: true, deletedAt: null },
      _count: { _all: true },
    });
    for (const g of grouped) counts.set(g.serverId, g._count._all);
    return counts;
  }

  async create(data: CreateTokenData): Promise<TokenRow> {
    return this.prisma.extHostingToken.create({
      data: {
        tenantId: data.tenantId,
        serverId: data.serverId,
        label: data.label,
        scope: data.scope,
        whmUser: data.whmUser,
        cpanelUser: data.cpanelUser ?? null,
        tokenEnc: data.tokenEnc,
        keyId: data.keyId,
        lastFour: data.lastFour,
        createdById: data.createdById,
        updatedById: data.createdById,
      },
    });
  }

  async update(tenantId: string, id: string, data: UpdateTokenData): Promise<TokenRow | null> {
    const patch: Record<string, unknown> = { updatedById: data.updatedById };
    if (data.label !== undefined) patch.label = data.label;
    if (data.isActive !== undefined) patch.isActive = data.isActive;
    if (data.tokenEnc !== undefined) patch.tokenEnc = data.tokenEnc;
    if (data.keyId !== undefined) patch.keyId = data.keyId;
    if (data.lastFour !== undefined) patch.lastFour = data.lastFour;
    const res = await this.prisma.extHostingToken.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: patch,
    });
    if (res.count === 0) return null;
    return this.findById(tenantId, id);
  }

  async softDelete(tenantId: string, id: string): Promise<boolean> {
    const res = await this.prisma.extHostingToken.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    });
    return res.count > 0;
  }

  async markUsed(tenantId: string, id: string, at: Date): Promise<void> {
    await this.prisma.extHostingToken.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { lastUsedAt: at },
    });
  }
}
