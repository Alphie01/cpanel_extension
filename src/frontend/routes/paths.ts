/* Absolute route paths for the hosting-control area (mounted by the host at
 * /dashboard/extensions/hosting-control). Centralized so navigation is never
 * hardcoded ad hoc. */
export const HOSTING_BASE = '/dashboard/extensions/hosting-control';

export const paths = {
  base: HOSTING_BASE,
  servers: `${HOSTING_BASE}/servers`,
  newServer: `${HOSTING_BASE}/servers/new`,
  server: (id: string): string => `${HOSTING_BASE}/servers/${id}`,
  editServer: (id: string): string => `${HOSTING_BASE}/servers/${id}/edit`,
  accounts: `${HOSTING_BASE}/accounts`,
  accountEmails: (id: string): string => `${HOSTING_BASE}/accounts/${id}/emails`,
  accountDomains: (id: string): string => `${HOSTING_BASE}/accounts/${id}/domains`,
  accountDatabases: (id: string): string => `${HOSTING_BASE}/accounts/${id}/databases`,
  deployments: `${HOSTING_BASE}/deployments`,
};
