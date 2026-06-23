/* Permission constants — the single source of truth, kept in lockstep with
 * extension.manifest.json `permissions`. Shared by backend (route guards) and
 * frontend (menu/visibility gating). */
export const PERMISSIONS = {
  view: 'hosting_control.view',
  admin: 'hosting_control.admin',
  servers: {
    view: 'hosting_control.servers.view',
    create: 'hosting_control.servers.create',
    edit: 'hosting_control.servers.edit',
    delete: 'hosting_control.servers.delete',
    testConnection: 'hosting_control.servers.test_connection',
  },
  tokens: {
    view: 'hosting_control.tokens.view',
    create: 'hosting_control.tokens.create',
    edit: 'hosting_control.tokens.edit',
    delete: 'hosting_control.tokens.delete',
  },
  accounts: { view: 'hosting_control.accounts.view' },
  metrics: { view: 'hosting_control.metrics.view' },
  email: { view: 'hosting_control.email.view', manage: 'hosting_control.email.manage' },
  domains: { view: 'hosting_control.domains.view', manage: 'hosting_control.domains.manage' },
  databases: { view: 'hosting_control.databases.view', manage: 'hosting_control.databases.manage' },
  ftp: { view: 'hosting_control.ftp.view', manage: 'hosting_control.ftp.manage' },
  deployments: {
    view: 'hosting_control.deployments.view',
    run: 'hosting_control.deployments.run',
    rollback: 'hosting_control.deployments.rollback',
  },
} as const;

export const ADMIN_PERMISSION = PERMISSIONS.admin;

function collect(node: unknown, out: string[]): void {
  if (typeof node === 'string') {
    out.push(node);
    return;
  }
  if (node && typeof node === 'object') {
    for (const value of Object.values(node)) collect(value, out);
  }
}

export const ALL_PERMISSIONS: string[] = (() => {
  const out: string[] = [];
  collect(PERMISSIONS, out);
  return out;
})();
