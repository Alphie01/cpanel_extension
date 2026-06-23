/* Server business logic: validation coordination, audit logging, and the
 * test-connection orchestration (decrypt active token → call WHM → persist
 * status). Tenant scoping is enforced by passing ctx.tenantId to every repo call. */
import type { Paginated } from '../../shared/types/common.types';
import type { ServerDto, ServerStatus, TestConnectionResult } from '../../shared/types/server.types';
import type { TenantContext } from '../context/tenant-context.types';
import { toServerDto } from '../dto/server.dto';
import type { ServersRepository } from '../repositories/servers.repository';
import type { TokensRepository } from '../repositories/tokens.repository';
import { writeAudit, type AuditSink } from '../utils/audit';
import type { CryptoService } from '../utils/crypto';
import { Errors, isExtensionError } from '../utils/errors';
import type { Logger } from '../utils/logger';
import type { CreateServerInput, ListServersQuery, UpdateServerInput } from '../validators/server.validators';
import type { WhmApiClient } from './whm-api.client';

export class ServersService {
  constructor(
    private readonly servers: ServersRepository,
    private readonly tokens: TokensRepository,
    private readonly crypto: CryptoService,
    private readonly whm: WhmApiClient,
    private readonly audit: AuditSink,
    private readonly logger: Logger,
  ) {}

  async list(ctx: TenantContext, query: ListServersQuery): Promise<Paginated<ServerDto>> {
    const skip = (query.page - 1) * query.pageSize;
    const { rows, total } = await this.servers.list(ctx.tenantId, {
      status: query.status,
      search: query.search,
      skip,
      take: query.pageSize,
    });
    const counts = await this.tokens.countActiveByServerIds(
      ctx.tenantId,
      rows.map((r) => r.id),
    );
    return {
      items: rows.map((r) => toServerDto(r, counts.get(r.id) ?? 0)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getById(ctx: TenantContext, id: string): Promise<ServerDto> {
    const row = await this.servers.findById(ctx.tenantId, id);
    if (!row) throw Errors.notFound('Server');
    const counts = await this.tokens.countActiveByServerIds(ctx.tenantId, [id]);
    return toServerDto(row, counts.get(id) ?? 0);
  }

  async create(ctx: TenantContext, input: CreateServerInput): Promise<ServerDto> {
    const existing = await this.servers.findByName(ctx.tenantId, input.name);
    if (existing) {
      throw Errors.conflict('A server with this name already exists.', { name: input.name });
    }
    const row = await this.servers.create({
      tenantId: ctx.tenantId,
      name: input.name,
      hostname: input.hostname,
      port: input.port,
      verifySsl: input.verifySsl,
      notes: input.notes,
      createdById: ctx.userId,
    });
    await writeAudit(this.audit, ctx, {
      action: 'server.create',
      entityType: 'server',
      entityId: row.id,
      metadata: { name: row.name, hostname: row.hostname, port: row.port },
    });
    return toServerDto(row, 0);
  }

  async update(ctx: TenantContext, id: string, input: UpdateServerInput): Promise<ServerDto> {
    if (input.name) {
      const clash = await this.servers.findByName(ctx.tenantId, input.name);
      if (clash && clash.id !== id) {
        throw Errors.conflict('A server with this name already exists.', { name: input.name });
      }
    }
    const row = await this.servers.update(ctx.tenantId, id, { ...input, updatedById: ctx.userId });
    if (!row) throw Errors.notFound('Server');
    await writeAudit(this.audit, ctx, {
      action: 'server.update',
      entityType: 'server',
      entityId: id,
      metadata: { fields: Object.keys(input) },
    });
    const counts = await this.tokens.countActiveByServerIds(ctx.tenantId, [id]);
    return toServerDto(row, counts.get(id) ?? 0);
  }

  async remove(ctx: TenantContext, id: string): Promise<void> {
    const ok = await this.servers.softDelete(ctx.tenantId, id);
    if (!ok) throw Errors.notFound('Server');
    await writeAudit(this.audit, ctx, {
      action: 'server.delete',
      entityType: 'server',
      entityId: id,
    });
  }

  async testConnection(ctx: TenantContext, id: string): Promise<TestConnectionResult> {
    const server = await this.servers.findById(ctx.tenantId, id);
    if (!server) throw Errors.notFound('Server');

    const token = await this.tokens.findActiveForServer(ctx.tenantId, id, 'WHM');
    if (!token) {
      throw Errors.validation('No active WHM token is configured for this server.');
    }

    const checkedAt = new Date();
    let status: ServerStatus;
    let ok: boolean;
    let message: string;
    let whmVersion: string | null = null;

    try {
      // Plaintext exists only within this scope and is handed straight to the
      // WHM client — never logged, returned, or persisted.
      const secret = this.crypto.decrypt(token.tokenEnc, token.keyId);
      const info = await this.whm.testConnection({
        hostname: server.hostname,
        port: server.port,
        user: token.whmUser,
        token: secret,
        verifySsl: server.verifySsl,
      });
      whmVersion = info.version;
      status = 'ACTIVE';
      ok = true;
      message = info.version ? `Connected to WHM ${info.version}.` : 'Connection successful.';
      await this.tokens.markUsed(ctx.tenantId, token.id, checkedAt);
    } catch (err) {
      ok = false;
      status = 'UNREACHABLE';
      message = isExtensionError(err) ? err.message : 'Connection failed.';
      this.logger.warn('WHM test-connection failed', {
        tenantId: ctx.tenantId,
        requestId: ctx.requestId,
        operation: 'server.test_connection',
        status: 'FAILURE',
        serverId: id,
      });
    }

    await this.servers.setStatus(ctx.tenantId, id, status, ok ? null : message, checkedAt);
    await writeAudit(this.audit, ctx, {
      action: 'server.test_connection',
      entityType: 'server',
      entityId: id,
      status: ok ? 'SUCCESS' : 'FAILURE',
      metadata: { result: status, whmVersion },
    });

    return { ok, status, whmVersion, message, checkedAt: checkedAt.toISOString() };
  }
}
