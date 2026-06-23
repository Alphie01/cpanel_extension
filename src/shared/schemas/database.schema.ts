/* Zod schemas for database operations (shared backend + frontend). */
import { z } from 'zod';

const dbIdentifier = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores are allowed.');

export const createDatabaseSchema = z.object({ name: dbIdentifier });

export const createDatabaseUserSchema = z.object({
  name: dbIdentifier,
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
});

export const assignDatabaseUserSchema = z.object({
  user: z.string().min(1).max(64),
  database: z.string().min(1).max(64),
  privileges: z.string().max(512).optional(),
});

export const dbNameParamSchema = z.object({
  id: z.string().min(1).max(64),
  dbName: z.string().min(1).max(128),
});

export const dbUserParamSchema = z.object({
  id: z.string().min(1).max(64),
  dbUser: z.string().min(1).max(128),
});

export type CreateDatabaseInput = z.infer<typeof createDatabaseSchema>;
export type CreateDatabaseUserInput = z.infer<typeof createDatabaseUserSchema>;
export type AssignDatabaseUserInput = z.infer<typeof assignDatabaseUserSchema>;
