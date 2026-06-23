/* Email account business logic for a selected cPanel account. Resolves the
 * server's active WHM token, decrypts it, and drives the cPanel client via the
 * WHM proxy. Passwords are accepted but NEVER logged or returned. */
import type { CreateEmailInput, UpdateEmailInput } from '../../shared/schemas/email.schema';
import type { EmailAccountDto } from '../../shared/types/email.types';
import type { TenantContext } from '../context/tenant-context.types';
import { writeAudit, type AuditSink } from '../utils/audit';
import type { AccountWhmResolver } from './account-whm-context';
import type { CpanelApiClient } from './cpanel-api.client';

export class EmailService {
  constructor(
    private readonly resolver: AccountWhmResolver,
    private readonly cpanel: CpanelApiClient,
    private readonly audit: AuditSink,
  ) {}

  async list(ctx: TenantContext, accountId: string): Promise<EmailAccountDto[]> {
    const { creds, account } = await this.resolver.resolve(ctx, accountId);
    return this.cpanel.listEmailAccounts(creds, account.cpanelUser);
  }

  async create(ctx: TenantContext, accountId: string, input: CreateEmailInput): Promise<EmailAccountDto> {
    const { creds, account } = await this.resolver.resolve(ctx, accountId);
    await this.cpanel.createEmailAccount(creds, account.cpanelUser, input);
    const email = `${input.user}@${input.domain}`;
    await writeAudit(this.audit, ctx, {
      action: 'email.create',
      entityType: 'email_account',
      entityId: email,
      metadata: { accountId, email, quotaMb: input.quotaMb },
    });
    return { email, quotaMb: input.quotaMb === 0 ? null : input.quotaMb, usedMb: 0, suspended: false };
  }

  async update(
    ctx: TenantContext,
    accountId: string,
    email: string,
    input: UpdateEmailInput,
  ): Promise<EmailAccountDto> {
    const { creds, account } = await this.resolver.resolve(ctx, accountId);
    if (input.password !== undefined) {
      await this.cpanel.setEmailPassword(creds, account.cpanelUser, email, input.password);
    }
    if (input.quotaMb !== undefined) {
      await this.cpanel.setEmailQuota(creds, account.cpanelUser, email, input.quotaMb);
    }
    if (input.suspended !== undefined) {
      await this.cpanel.setEmailSuspended(creds, account.cpanelUser, email, input.suspended);
    }
    await writeAudit(this.audit, ctx, {
      action: 'email.update',
      entityType: 'email_account',
      entityId: email,
      // Field NAMES only — never the password value.
      metadata: { accountId, email, fields: Object.keys(input) },
    });
    const all = await this.cpanel.listEmailAccounts(creds, account.cpanelUser);
    return (
      all.find((e) => e.email === email) ?? {
        email,
        quotaMb: input.quotaMb ?? null,
        usedMb: null,
        suspended: input.suspended ?? false,
      }
    );
  }

  async remove(ctx: TenantContext, accountId: string, email: string): Promise<void> {
    const { creds, account } = await this.resolver.resolve(ctx, accountId);
    await this.cpanel.deleteEmailAccount(creds, account.cpanelUser, email);
    await writeAudit(this.audit, ctx, {
      action: 'email.delete',
      entityType: 'email_account',
      entityId: email,
      metadata: { accountId, email },
    });
  }
}
