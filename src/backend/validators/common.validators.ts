/* Shared request-shape validators (route params). */
import { z } from 'zod';

export const idParamSchema = z.object({ id: z.string().min(1).max(64) });
export const serverIdParamSchema = z.object({ serverId: z.string().min(1).max(64) });
