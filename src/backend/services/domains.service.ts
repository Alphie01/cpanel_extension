/* Domain business logic for a selected cPanel account: list all domains (main /
 * addon / subdomain / parked) with SSL status, and trigger AutoSSL. SSL lookup
 * is best-effort enrichment — a failure degrades to "none" and is logged. */
import type { DomainDto, DomainType } from '../../shared/types/domain.types';
import type { TenantContext } from '../context/tenant-context.types';
import { writeAudit, type AuditSink } from '../utils/audit';
import { isExtensionError } from '../utils/errors';
import type { Logger } from '../utils/logger';
import type { AccountWhmResolver } from './account-whm-context';
import type { CpanelApiClient } from './cpanel-api.client';

function domainDto(domain: string, type: DomainType, sslDomains: Set<string>): DomainDto {
  return { domain, type, sslStatus: sslDomains.has(domain) ? 'active' : 'none' };
}

export class DomainsService {
  constructor(
    private readonly resolver: AccountWhmResolver,
    private readonly cpanel: CpanelApiClient,
    private readonly audit: AuditSink,
    private readonly logger: Logger,
  ) {}

  async list(ctx: TenantContext, accountId: string): Promise<DomainDto[]> {
    const { creds, account } = await this.resolver.resolve(ctx, accountId);
    const groups = await this.cpanel.listDomains(creds, account.cpanelUser);

    let sslDomains = new Set<string>();
    try {
      sslDomains = new Set(await this.cpanel.listSslDomains(creds, account.cpanelUser));
    } catch (err) {
      this.logger.warn('SSL status lookup failed; defaulting to none', {
        tenantId: ctx.tenantId,
        operation: 'domain.ssl_lookup',
        status: 'FAILURE',
        reason: isExtensionError(err) ? err.code : 'unknown',
      });
    }

    const out: DomainDto[] = [];
    if (groups.main) out.push(domainDto(groups.main, 'main', sslDomains));
    for (const d of groups.addon) out.push(domainDto(d, 'addon', sslDomains));
    for (const d of groups.sub) out.push(domainDto(d, 'subdomain', sslDomains));
    for (const d of groups.parked) out.push(domainDto(d, 'parked', sslDomains));
    return out;
  }

  async triggerAutoSsl(ctx: TenantContext, accountId: string): Promise<void> {
    const { creds, account } = await this.resolver.resolve(ctx, accountId);
    await this.cpanel.triggerAutoSsl(creds, account.cpanelUser);
    await writeAudit(this.audit, ctx, {
      action: 'domain.autossl',
      entityType: 'account',
      entityId: accountId,
      metadata: { cpanelUser: account.cpanelUser },
    });
  }
}
