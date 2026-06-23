/* Zod schemas for token requests. The `token` field is the raw secret and is
 * write-only — accepted on create/rotate, never returned. */
import { z } from 'zod';

export const createTokenSchema = z
  .object({
    label: z.string().min(1, 'Label is required.').max(120),
    scope: z.enum(['WHM', 'CPANEL']).default('WHM'),
    whmUser: z.string().min(1, 'WHM/cPanel user is required.').max(120),
    cpanelUser: z.string().max(120).optional(),
    token: z.string().min(8, 'Token looks too short.').max(4096),
  })
  .refine((v) => v.scope !== 'CPANEL' || (v.cpanelUser?.length ?? 0) > 0, {
    message: 'cpanelUser is required when scope is CPANEL.',
    path: ['cpanelUser'],
  });

export const updateTokenSchema = z
  .object({
    label: z.string().min(1).max(120).optional(),
    isActive: z.boolean().optional(),
    token: z.string().min(8).max(4096).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'At least one field must be provided.',
  });

export type CreateTokenInput = z.infer<typeof createTokenSchema>;
export type UpdateTokenInput = z.infer<typeof updateTokenSchema>;
