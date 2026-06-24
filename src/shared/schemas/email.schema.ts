/* Zod schemas for email-account requests (shared backend + frontend). The
 * password is write-only and never echoed back. */
import { z } from 'zod';

// Forms send numbers/booleans as strings → coerce.
const quotaField = z.preprocess(
  (v) => (v === '' || v === null ? undefined : v),
  z.coerce.number().int().min(0).max(1024 * 1024).default(0),
);

const suspendedField = z.preprocess((v) => {
  if (typeof v === 'string') return /^(1|true|on|yes)$/i.test(v.trim());
  return v;
}, z.boolean());

export const createEmailSchema = z.object({
  user: z
    .string()
    .min(1, 'Mailbox name is required.')
    .max(64)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Mailbox name contains invalid characters.'),
  domain: z.string().min(1).max(253),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
  quotaMb: quotaField,
});

export const updateEmailSchema = z
  .object({
    password: z.string().min(8).max(128).optional(),
    quotaMb: z.coerce.number().int().min(0).max(1024 * 1024).optional(),
    suspended: suspendedField.optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'At least one field must be provided.',
  });

export const emailParamSchema = z.object({
  id: z.string().min(1).max(64),
  emailId: z.string().min(3).max(254),
});

export type CreateEmailInput = z.infer<typeof createEmailSchema>;
export type UpdateEmailInput = z.infer<typeof updateEmailSchema>;
