/* Server controllers: parse the validated request, call the service, shape the
 * HTTP response. No business logic, no DB access. */
import type { Request, Response } from 'express';
import { getTenant } from '../middleware/tenant-context.middleware';
import type { ServersService } from '../services/servers.service';
import type {
  CreateServerInput,
  ListServersQuery,
  UpdateServerInput,
} from '../validators/server.validators';

export class ServersController {
  constructor(private readonly service: ServersService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const query = req.validated?.query as ListServersQuery;
    res.json(await this.service.list(ctx, query));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const body = req.validated?.body as CreateServerInput;
    res.status(201).json(await this.service.create(ctx, body));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const { id } = req.validated?.params as { id: string };
    res.json(await this.service.getById(ctx, id));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const { id } = req.validated?.params as { id: string };
    const body = req.validated?.body as UpdateServerInput;
    res.json(await this.service.update(ctx, id, body));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const { id } = req.validated?.params as { id: string };
    await this.service.remove(ctx, id);
    res.status(204).send();
  };

  testConnection = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const { id } = req.validated?.params as { id: string };
    res.json(await this.service.testConnection(ctx, id));
  };
}
