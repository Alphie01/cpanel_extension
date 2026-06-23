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

// ── Native declarative views (dashboard renders tables/forms from these) ──────
const viewColumnSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['text', 'number', 'boolean', 'date', 'badge']).optional(),
});

const viewActionFieldSchema = z.object({
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.string().optional(),
  required: z.boolean().optional(),
  secret: z.boolean().optional(),
});

const viewActionSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  method: z.enum(['GET', 'POST', 'PATCH', 'PUT', 'DELETE']),
  path: z.string().min(1),
  scope: z.enum(['collection', 'row']),
  fields: z.array(viewActionFieldSchema).optional(),
  permission: z.string().optional(),
  rowKey: z.string().optional(),
  danger: z.boolean().optional(),
  confirm: z.string().optional(),
});

// Drill-down detail (row → sections). A section is either a single object
// rendered as key/value fields, or an array rendered as a table.
const detailSectionSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(['fields', 'table']),
  permission: z.string().min(1),
  data: z.object({
    method: z.enum(['GET', 'POST']),
    path: z.string().min(1),
    itemsKey: z.string().optional(),
  }),
  fields: z.array(viewColumnSchema).optional(),
  columns: z.array(viewColumnSchema).optional(),
  actions: z.array(viewActionSchema).optional(),
});

const detailSchema = z.object({
  title: z.string().min(1),
  idKey: z.string().min(1),
  sections: z.array(detailSectionSchema).min(1),
});

const viewSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  permission: z.string().min(1),
  data: z.object({
    method: z.enum(['GET', 'POST']),
    path: z.string().min(1),
    itemsKey: z.string().optional(),
  }),
  columns: z.array(viewColumnSchema).min(1),
  actions: z.array(viewActionSchema).optional(),
  detail: detailSchema.optional(),
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
    appUrl: z.string().optional(),
    routes: z.array(routeSchema),
    views: z.array(viewSchema).optional(),
  }),
  backend: z.object({
    enabled: z.boolean(),
    apiPrefix: z.string(),
    // entrypoint (in-process) and baseUrl/healthUrl (out-of-process) are both
    // valid depending on the runtime model; require at least one health target.
    entrypoint: z.string().min(1).optional(),
    healthcheck: z.string().startsWith('/').optional(),
    baseUrl: z.string().optional(),
    healthUrl: z.string().optional(),
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

  // Views: permission must be declared; data/action paths must live under the API.
  const gatewayPrefix = m.backend.apiPrefix.replace(/^\//, '');
  const checkAction = (
    label: string,
    action: { key: string; path: string; permission?: string },
  ): void => {
    if (!action.path.startsWith(gatewayPrefix)) {
      errors.push(`${label} action "${action.key}" path must be under "${gatewayPrefix}"`);
    }
    if (action.permission && !permSet.has(action.permission)) {
      errors.push(`${label} action "${action.key}" requires "${action.permission}" which is not declared`);
    }
  };
  for (const view of m.frontend.views ?? []) {
    if (!permSet.has(view.permission)) {
      errors.push(`view "${view.key}" requires "${view.permission}" which is not declared in permissions`);
    }
    if (!view.data.path.startsWith(gatewayPrefix)) {
      errors.push(`view "${view.key}" data.path must be under "${gatewayPrefix}"`);
    }
    for (const action of view.actions ?? []) checkAction(`view "${view.key}"`, action);
    for (const section of view.detail?.sections ?? []) {
      if (!permSet.has(section.permission)) {
        errors.push(`view "${view.key}" detail section "${section.key}" requires "${section.permission}" which is not declared`);
      }
      if (!section.data.path.startsWith(gatewayPrefix)) {
        errors.push(`view "${view.key}" detail section "${section.key}" data.path must be under "${gatewayPrefix}"`);
      }
      for (const action of section.actions ?? []) {
        checkAction(`view "${view.key}" section "${section.key}"`, action);
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
