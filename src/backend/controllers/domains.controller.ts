/* Domain controllers. */
import type { Request, Response } from 'express';
import { getTenant } from '../middleware/tenant-context.middleware';
import type { DomainsService } from '../services/domains.service';

export class DomainsController {
  constructor(private readonly service: DomainsService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const { id } = req.validated?.params as { id: string };
    res.json(await this.service.list(ctx, id));
  };

  autoSsl = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const { id } = req.validated?.params as { id: string };
    await this.service.triggerAutoSsl(ctx, id);
    res.json({ ok: true });
  };
}
