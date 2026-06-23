/* Database controllers. Delete-database requires `?confirm=true`. */
import type { Request, Response } from 'express';
import type {
  AssignDatabaseUserInput,
  CreateDatabaseInput,
  CreateDatabaseUserInput,
} from '../../shared/schemas/database.schema';
import { getTenant } from '../middleware/tenant-context.middleware';
import type { DatabasesService } from '../services/databases.service';

export class DatabasesController {
  constructor(private readonly service: DatabasesService) {}

  overview = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const { id } = req.validated?.params as { id: string };
    res.json(await this.service.overview(ctx, id));
  };

  createDatabase = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const { id } = req.validated?.params as { id: string };
    const body = req.validated?.body as CreateDatabaseInput;
    await this.service.createDatabase(ctx, id, body);
    res.status(201).json({ created: body.name });
  };

  createUser = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const { id } = req.validated?.params as { id: string };
    const body = req.validated?.body as CreateDatabaseUserInput;
    await this.service.createUser(ctx, id, body);
    res.status(201).json({ created: body.name });
  };

  assignUser = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const { id } = req.validated?.params as { id: string };
    const body = req.validated?.body as AssignDatabaseUserInput;
    await this.service.assignUser(ctx, id, body);
    res.json({ ok: true });
  };

  deleteDatabase = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const { id, dbName } = req.validated?.params as { id: string; dbName: string };
    const confirm = req.query.confirm === 'true';
    await this.service.deleteDatabase(ctx, id, dbName, confirm);
    res.status(204).send();
  };

  deleteUser = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const { id, dbUser } = req.validated?.params as { id: string; dbUser: string };
    await this.service.deleteUser(ctx, id, dbUser);
    res.status(204).send();
  };
}
