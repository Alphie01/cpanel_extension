/* Token controllers: parse the validated request, call the service, respond. */
import type { Request, Response } from 'express';
import { getTenant } from '../middleware/tenant-context.middleware';
import type { TokensService } from '../services/tokens.service';
import type { CreateTokenInput, UpdateTokenInput } from '../validators/token.validators';

export class TokensController {
  constructor(private readonly service: TokensService) {}

  listForServer = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const { serverId } = req.validated?.params as { serverId: string };
    res.json(await this.service.listForServer(ctx, serverId));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const { serverId } = req.validated?.params as { serverId: string };
    const body = req.validated?.body as CreateTokenInput;
    res.status(201).json(await this.service.create(ctx, serverId, body));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const { id } = req.validated?.params as { id: string };
    res.json(await this.service.getById(ctx, id));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const { id } = req.validated?.params as { id: string };
    const body = req.validated?.body as UpdateTokenInput;
    res.json(await this.service.update(ctx, id, body));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const { id } = req.validated?.params as { id: string };
    await this.service.remove(ctx, id);
    res.status(204).send();
  };
}
