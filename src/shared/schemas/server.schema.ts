/* Zod schemas for server requests — shared by backend validation middleware and
 * frontend forms so both enforce identical rules. */
import { z } from 'zod';

// FQDN or IPv4/IPv6 literal; conservative character allow-list.
export const hostnameSchema = z
  .string()
  .min(1)
  .max(253)
  .regex(/^[a-zA-Z0-9.:_-]+$/, 'Hostname contains invalid characters.');

export const createServerSchema = z.object({
  name: z.string().min(1, 'Name is required.').max(120),
  hostname: hostnameSchema,
  port: z.number().int().min(1).max(65535).default(2087),
  verifySsl: z.boolean().default(true),
  notes: z.string().max(2000).optional(),
});

export const updateServerSchema = createServerSchema.partial();

export const listServersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['ACTIVE', 'INACTIVE', 'UNREACHABLE']).optional(),
  search: z.string().max(120).optional(),
});

export type CreateServerInput = z.infer<typeof createServerSchema>;
export type UpdateServerInput = z.infer<typeof updateServerSchema>;
export type ListServersQuery = z.infer<typeof listServersQuerySchema>;
