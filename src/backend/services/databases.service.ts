/* MySQL database business logic for a selected cPanel account: list databases +
 * users, create databases/users, assign users to databases, and delete (delete
 * of a database is destructive and requires explicit confirmation). */
import type {
  AssignDatabaseUserInput,
  CreateDatabaseInput,
  CreateDatabaseUserInput,
} from '../../shared/schemas/database.schema';
import type { DatabasesOverview } from '../../shared/types/database.types';
import type { TenantContext } from '../context/tenant-context.types';
import { writeAudit, type AuditSink } from '../utils/audit';
import { Errors } from '../utils/errors';
import type { AccountWhmResolver } from './account-whm-context';
import type { CpanelApiClient } from './cpanel-api.client';

const DEFAULT_PRIVILEGES = 'ALL PRIVILEGES';

export class DatabasesService {
  constructor(
    private readonly resolver: AccountWhmResolver,
    private readonly cpanel: CpanelApiClient,
    private readonly audit: AuditSink,
  ) {}

  async overview(ctx: TenantContext, accountId: string): Promise<DatabasesOverview> {
    const { creds, account } = await this.resolver.resolve(ctx, accountId);
    const [databases, userNames] = await Promise.all([
      this.cpanel.listDatabases(creds, account.cpanelUser),
      this.cpanel.listDatabaseUsers(creds, account.cpanelUser),
    ]);
    return { databases, users: userNames.map((user) => ({ user })) };
  }

  async createDatabase(ctx: TenantContext, accountId: string, input: CreateDatabaseInput): Promise<void> {
    const { creds, account } = await this.resolver.resolve(ctx, accountId);
    await this.cpanel.createDatabase(creds, account.cpanelUser, input.name);
    await writeAudit(this.audit, ctx, {
      action: 'database.create',
      entityType: 'database',
      entityId: input.name,
      metadata: { accountId },
    });
  }

  async createUser(ctx: TenantContext, accountId: string, input: CreateDatabaseUserInput): Promise<void> {
    const { creds, account } = await this.resolver.resolve(ctx, accountId);
    await this.cpanel.createDatabaseUser(creds, account.cpanelUser, input.name, input.password);
    await writeAudit(this.audit, ctx, {
      action: 'database.user.create',
      entityType: 'database_user',
      entityId: input.name,
      // Field names only — never the password value.
      metadata: { accountId },
    });
  }

  async assignUser(ctx: TenantContext, accountId: string, input: AssignDatabaseUserInput): Promise<void> {
    const { creds, account } = await this.resolver.resolve(ctx, accountId);
    await this.cpanel.assignDatabaseUser(
      creds,
      account.cpanelUser,
      input.user,
      input.database,
      input.privileges ?? DEFAULT_PRIVILEGES,
    );
    await writeAudit(this.audit, ctx, {
      action: 'database.assign',
      entityType: 'database',
      entityId: input.database,
      metadata: { accountId, user: input.user },
    });
  }

  async deleteDatabase(
    ctx: TenantContext,
    accountId: string,
    name: string,
    confirm: boolean,
  ): Promise<void> {
    if (!confirm) {
      throw Errors.validation('Deleting a database is destructive; pass confirm=true to proceed.');
    }
    const { creds, account } = await this.resolver.resolve(ctx, accountId);
    await this.cpanel.deleteDatabase(creds, account.cpanelUser, name);
    await writeAudit(this.audit, ctx, {
      action: 'database.delete',
      entityType: 'database',
      entityId: name,
      metadata: { accountId },
    });
  }

  async deleteUser(ctx: TenantContext, accountId: string, name: string): Promise<void> {
    const { creds, account } = await this.resolver.resolve(ctx, accountId);
    await this.cpanel.deleteDatabaseUser(creds, account.cpanelUser, name);
    await writeAudit(this.audit, ctx, {
      action: 'database.user.delete',
      entityType: 'database_user',
      entityId: name,
      metadata: { accountId },
    });
  }
}
