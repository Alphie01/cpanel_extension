/* Token business logic: ownership checks, encryption on create/rotate, audit
 * logging. The raw token is encrypted immediately and never returned. */
import type { TokenDto } from '../../shared/types/token.types';
import type { TenantContext } from '../context/tenant-context.types';
import { toTokenDto } from '../dto/token.dto';
import type { ServersRepository } from '../repositories/servers.repository';
import type { TokensRepository, UpdateTokenData } from '../repositories/tokens.repository';
import { writeAudit, type AuditSink } from '../utils/audit';
import type { CryptoService } from '../utils/crypto';
import { Errors } from '../utils/errors';
import { lastFour } from '../utils/redact';
import type { CreateTokenInput, UpdateTokenInput } from '../validators/token.validators';

export class TokensService {
  constructor(
    private readonly tokens: TokensRepository,
    private readonly servers: ServersRepository,
    private readonly crypto: CryptoService,
    private readonly audit: AuditSink,
  ) {}

  private async assertServerOwned(ctx: TenantContext, serverId: string): Promise<void> {
    const server = await this.servers.findById(ctx.tenantId, serverId);
    if (!server) throw Errors.notFound('Server');
  }

  async listForServer(ctx: TenantContext, serverId: string): Promise<TokenDto[]> {
    await this.assertServerOwned(ctx, serverId);
    const rows = await this.tokens.listForServer(ctx.tenantId, serverId);
    return rows.map(toTokenDto);
  }

  async getById(ctx: TenantContext, id: string): Promise<TokenDto> {
    const row = await this.tokens.findById(ctx.tenantId, id);
    if (!row) throw Errors.notFound('Token');
    return toTokenDto(row);
  }

  async create(ctx: TenantContext, serverId: string, input: CreateTokenInput): Promise<TokenDto> {
    await this.assertServerOwned(ctx, serverId);
    const clash = await this.tokens.findByLabel(ctx.tenantId, serverId, input.label);
    if (clash) {
      throw Errors.conflict('A token with this label already exists for the server.', {
        label: input.label,
      });
    }
    const encrypted = this.crypto.encrypt(input.token);
    const row = await this.tokens.create({
      tenantId: ctx.tenantId,
      serverId,
      label: input.label,
      scope: input.scope,
      whmUser: input.whmUser,
      cpanelUser: input.cpanelUser,
      tokenEnc: encrypted.ciphertext,
      keyId: encrypted.keyId,
      lastFour: lastFour(input.token),
      createdById: ctx.userId,
    });
    await writeAudit(this.audit, ctx, {
      action: 'token.create',
      entityType: 'token',
      entityId: row.id,
      metadata: { serverId, label: row.label, scope: row.scope, whmUser: row.whmUser },
    });
    return toTokenDto(row);
  }

  async update(ctx: TenantContext, id: string, input: UpdateTokenInput): Promise<TokenDto> {
    const existing = await this.tokens.findById(ctx.tenantId, id);
    if (!existing) throw Errors.notFound('Token');

    const patch: UpdateTokenData = { updatedById: ctx.userId };
    if (input.label !== undefined) patch.label = input.label;
    if (input.isActive !== undefined) patch.isActive = input.isActive;
    const rotated = input.token !== undefined;
    if (input.token !== undefined) {
      const encrypted = this.crypto.encrypt(input.token);
      patch.tokenEnc = encrypted.ciphertext;
      patch.keyId = encrypted.keyId;
      patch.lastFour = lastFour(input.token);
    }

    const row = await this.tokens.update(ctx.tenantId, id, patch);
    if (!row) throw Errors.notFound('Token');
    await writeAudit(this.audit, ctx, {
      action: 'token.update',
      entityType: 'token',
      entityId: id,
      metadata: { rotated, fields: Object.keys(input) },
    });
    return toTokenDto(row);
  }

  async remove(ctx: TenantContext, id: string): Promise<void> {
    const ok = await this.tokens.softDelete(ctx.tenantId, id);
    if (!ok) throw Errors.notFound('Token');
    await writeAudit(this.audit, ctx, {
      action: 'token.delete',
      entityType: 'token',
      entityId: id,
    });
  }
}
