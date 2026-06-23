/* Account controllers: parse the validated request, call the service, respond.
 * Sync delegates to HostingSyncService with the caller's tenant context. */
import type { Request, Response } from 'express';
import type { ListAccountsQuery } from '../../shared/schemas/account.schema';
import { getTenant } from '../middleware/tenant-context.middleware';
import type { AccountsService } from '../services/accounts.service';
import type { HostingSyncService } from '../services/hosting-sync.service';

export class AccountsController {
  constructor(
    private readonly accounts: AccountsService,
    private readonly sync: HostingSyncService,
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const query = req.validated?.query as ListAccountsQuery;
    res.json(await this.accounts.list(ctx, query));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const { id } = req.validated?.params as { id: string };
    res.json(await this.accounts.getById(ctx, id));
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const { id } = req.validated?.params as { id: string };
    res.json(await this.accounts.refresh(ctx, id));
  };

  getMetrics = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const { id } = req.validated?.params as { id: string };
    res.json(await this.accounts.getMetrics(ctx, id));
  };

  syncServer = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const { serverId } = req.validated?.params as { serverId: string };
    const count = await this.sync.syncServer(ctx, serverId);
    res.json({ serverId, accounts: count });
  };
}
