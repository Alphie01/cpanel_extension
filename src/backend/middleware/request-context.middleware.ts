/* Assigns a requestId to every request (honoring an inbound x-request-id) and
 * echoes it back. Establishes the correlation id used in logs and audit rows. */
import { randomUUID } from 'node:crypto';
import type { Request, RequestHandler, Response } from 'express';

export function requestContext(): RequestHandler {
  return (req: Request, res: Response, next): void => {
    const inbound = req.headers['x-request-id'];
    const requestId = (typeof inbound === 'string' && inbound.length > 0 ? inbound : randomUUID());
    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  };
}
