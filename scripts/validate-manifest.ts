/* Validates extension.manifest.json against the platform contract.
 * Exported helpers are reused by tests/security/manifest-validation.test.ts.
 * Run: `npm run manifest:validate` (exits non-zero on failure). */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

const SLUG = 'cpanel-whm-manager';
const TABLE_PREFIX = 'ext_hosting_';
const PERMISSION_RE = /^hosting_control(\.[a-z0-9_]+)*$/;
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const routeSchema = z.object({
  path: z.string().startsWith('/dashboard/'),
  label: z.string().min(1),
  icon: z.string().min(1),
  requiredPermissions: z.array(z.string()).default([]),
});

const envSchema = z.object({
  name: z.string().min(1),
  required: z.boolean(),
  secret: z.boolean(),
  description: z.string().optional(),
});

const manifestSchema = z.object({
  name: z.string().min(1),
  slug: z.string().regex(SLUG_RE, 'slug must be URL-safe kebab-case'),
  displayName: z.string().min(1),
  version: z.string().regex(SEMVER_RE, 'version must be semver'),
  description: z.string().min(1),
  moduleType: z.literal('tenant_extension'),
  runtime: z.literal('node'),
  language: z.literal('typescript'),
  trustLevel: z.string().min(1),
  frontend: z.object({
    enabled: z.boolean(),
    routes: z.array(routeSchema),
  }),
  backend: z.object({
    enabled: z.boolean(),
    apiPrefix: z.string(),
    entrypoint: z.string().min(1),
    healthcheck: z.string().startsWith('/'),
  }),
  database: z.object({
    enabled: z.boolean(),
    prismaSchema: z.string().min(1),
    migrationsPath: z.string().min(1),
    seed: z.string().min(1),
    tablePrefix: z.string(),
  }),
  docker: z.object({
    enabled: z.boolean(),
    dockerfile: z.string().optional(),
    serviceName: z.string().optional(),
    internalPort: z.number().optional(),
    healthcheck: z.string().optional(),
  }),
  permissions: z.array(z.string()).min(1),
  env: z.array(envSchema),
  jobs: z
    .array(
      z.object({
        name: z.string().min(1),
        schedule: z.string().min(1),
        entrypoint: z.string().min(1),
        cost: z.number().optional(),
      }),
    )
    .default([]),
});

export type Manifest = z.infer<typeof manifestSchema>;

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export function validateManifest(input: unknown): ValidationResult {
  const errors: string[] = [];
  const parsed = manifestSchema.safeParse(input);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
    return { ok: false, errors };
  }

  const m = parsed.data;

  if (m.slug !== SLUG) errors.push(`slug must be "${SLUG}"`);
  if (m.database.tablePrefix !== TABLE_PREFIX) {
    errors.push(`database.tablePrefix must be "${TABLE_PREFIX}"`);
  }
  if (!m.backend.apiPrefix.startsWith(`/api/extensions/${m.slug}`)) {
    errors.push(`backend.apiPrefix must stay under /api/extensions/${m.slug}`);
  }

  for (const perm of m.permissions) {
    if (!PERMISSION_RE.test(perm)) {
      errors.push(`permission "${perm}" must be namespaced under hosting_control.*`);
    }
  }

  const permSet = new Set(m.permissions);
  for (const route of m.frontend.routes) {
    for (const required of route.requiredPermissions) {
      if (!permSet.has(required)) {
        errors.push(`route ${route.path} requires "${required}" which is not declared in permissions`);
      }
    }
  }

  const encKey = m.env.find((e) => e.name === 'EXT_HOSTING_ENCRYPTION_KEY');
  if (!encKey) {
    errors.push('env must declare EXT_HOSTING_ENCRYPTION_KEY');
  } else if (!encKey.required || !encKey.secret) {
    errors.push('EXT_HOSTING_ENCRYPTION_KEY must be required and secret');
  }

  // Secrets must never be exposed to the frontend (defensive check).
  for (const e of m.env) {
    if (e.secret && /frontend|public|vite_/i.test(e.name)) {
      errors.push(`secret env "${e.name}" looks frontend-exposed`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function loadManifest(repoRoot = resolve(__dirname, '..')): unknown {
  const file = resolve(repoRoot, 'extension.manifest.json');
  return JSON.parse(readFileSync(file, 'utf8')) as unknown;
}

function main(): void {
  const result = validateManifest(loadManifest());
  if (!result.ok) {
    console.error('✖ extension.manifest.json is invalid:');
    for (const err of result.errors) console.error(`  - ${err}`);
    process.exit(1);
  }
  console.log('✓ extension.manifest.json is valid.');
}

if (typeof require !== 'undefined' && require.main === module) {
  main();
}
