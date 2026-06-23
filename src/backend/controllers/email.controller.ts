/* Email controllers: parse the validated request, call the service, respond.
 * The :emailId path param is the full email address (Express decodes it). */
import type { Request, Response } from 'express';
import type { CreateEmailInput, UpdateEmailInput } from '../../shared/schemas/email.schema';
import { getTenant } from '../middleware/tenant-context.middleware';
import type { EmailService } from '../services/email.service';

export class EmailController {
  constructor(private readonly service: EmailService) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const { id } = req.validated?.params as { id: string };
    res.json(await this.service.list(ctx, id));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const { id } = req.validated?.params as { id: string };
    const body = req.validated?.body as CreateEmailInput;
    res.status(201).json(await this.service.create(ctx, id, body));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const { id, emailId } = req.validated?.params as { id: string; emailId: string };
    const body = req.validated?.body as UpdateEmailInput;
    res.json(await this.service.update(ctx, id, emailId, body));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    const ctx = getTenant(req);
    const { id, emailId } = req.validated?.params as { id: string; emailId: string };
    await this.service.remove(ctx, id, emailId);
    res.status(204).send();
  };
}
