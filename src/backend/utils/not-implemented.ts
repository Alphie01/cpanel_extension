/* The single marker for deferred functionality. CLAUDE.md forbids TODO/FIXME
 * comments; calling notImplemented() is the explicit, type-safe marker instead.
 * Throws a 501 NOT_IMPLEMENTED that the error handler renders as the standard
 * envelope — so stub routes still run auth + permission + validation first. */
import { Errors } from './errors';

export function notImplemented(feature: string): never {
  throw Errors.notImplemented(feature);
}
