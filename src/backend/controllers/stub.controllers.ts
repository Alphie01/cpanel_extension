/* Stub controller factory for modules that are registered but not yet
 * implemented. The handler runs only AFTER auth + permission + validation have
 * passed, then throws 501 NOT_IMPLEMENTED — proving the wiring is real while the
 * body is deferred. No TODO markers: notImplemented() is the explicit marker. */
import type { Request, Response } from 'express';
import { notImplemented } from '../utils/not-implemented';

export function makeStubHandler(feature: string) {
  return async (_req: Request, _res: Response): Promise<void> => {
    notImplemented(feature);
  };
}
