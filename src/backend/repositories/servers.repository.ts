/* Server persistence. Prisma access only — no business decisions. Tenant-safety
 * invariant: every method requires tenantId and includes it in the WHERE, so an
 * id alone can never reach another tenant's row. */
import type { ServerStatus } from '../../shared/types/server.types';
import type { HostingPrismaClient, ServerRow } from './hosting-prisma';

export interface ServerListFilter {
  status?: ServerStatus;
  search?: string;
  skip: number;
  take: number;
}

export interface CreateServerData {
  tenantId: string;
  name: string;
  hostname: string;
  port: number;
  verifySsl: boolean;
  notes?: string;
  createdById: string | null;
}

export interface UpdateServerData {
  name?: string;
  hostname?: string;
  port?: number;
  verifySsl?: boolean;
  notes?: string;
  updatedById: string | null;
}

export interface ServersRepository {
  list(tenantId: string, filter: ServerListFilter): Promise<{ rows: ServerRow[]; total: number }>;
  findById(tenantId: string, id: string): Promise<ServerRow | null>;
  findByName(tenantId: string, name: string): Promise<ServerRow | null>;
  create(data: CreateServerData): Promise<ServerRow>;
  update(tenantId: string, id: string, data: UpdateServerData): Promise<ServerRow | null>;
  setStatus(
    tenantId: string,
    id: string,
    status: ServerStatus,
    lastError: string | null,
    checkedAt: Date,
  ): Promise<ServerRow | null>;
  softDelete(tenantId: string, id: string): Promise<boolean>;
}

export class PrismaServersRepository implements ServersRepository {
  constructor(private readonly prisma: HostingPrismaClient) {}

  async list(
    tenantId: string,
    filter: ServerListFilter,
  ): Promise<{ rows: ServerRow[]; total: number }> {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (filter.status) where.status = filter.status;
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { hostname: { contains: filter.search, mode: 'insensitive' } },
      ];
    }
    const [rows, total] = await Promise.all([
      this.prisma.extHostingServer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: filter.skip,
        take: filter.take,
      }),
      this.prisma.extHostingServer.count({ where }),
    ]);
    return { rows, total };
  }

  async findById(tenantId: string, id: string): Promise<ServerRow | null> {
    return this.prisma.extHostingServer.findFirst({ where: { id, tenantId, deletedAt: null } });
  }

  async findByName(tenantId: string, name: string): Promise<ServerRow | null> {
    return this.prisma.extHostingServer.findFirst({ where: { tenantId, name, deletedAt: null } });
  }

  async create(data: CreateServerData): Promise<ServerRow> {
    return this.prisma.extHostingServer.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        hostname: data.hostname,
        port: data.port,
        verifySsl: data.verifySsl,
        notes: data.notes ?? null,
        createdById: data.createdById,
        updatedById: data.createdById,
      },
    });
  }

  async update(tenantId: string, id: string, data: UpdateServerData): Promise<ServerRow | null> {
    const patch: Record<string, unknown> = { updatedById: data.updatedById };
    if (data.name !== undefined) patch.name = data.name;
    if (data.hostname !== undefined) patch.hostname = data.hostname;
    if (data.port !== undefined) patch.port = data.port;
    if (data.verifySsl !== undefined) patch.verifySsl = data.verifySsl;
    if (data.notes !== undefined) patch.notes = data.notes;
    const res = await this.prisma.extHostingServer.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: patch,
    });
    if (res.count === 0) return null;
    return this.findById(tenantId, id);
  }

  async setStatus(
    tenantId: string,
    id: string,
    status: ServerStatus,
    lastError: string | null,
    checkedAt: Date,
  ): Promise<ServerRow | null> {
    const res = await this.prisma.extHostingServer.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { status, lastError, lastCheckedAt: checkedAt },
    });
    if (res.count === 0) return null;
    return this.findById(tenantId, id);
  }

  async softDelete(tenantId: string, id: string): Promise<boolean> {
    const res = await this.prisma.extHostingServer.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return res.count > 0;
  }
}
