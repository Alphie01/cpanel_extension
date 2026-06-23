/* Zod schema for the account list query (shared backend + frontend). */
import { z } from 'zod';

export const listAccountsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  serverId: z.string().min(1).max(64).optional(),
  search: z.string().max(120).optional(),
  suspended: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
});

export type ListAccountsQuery = z.infer<typeof listAccountsQuerySchema>;
