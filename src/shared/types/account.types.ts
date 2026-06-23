/* Account API contracts (shared backend + frontend). Numeric metrics are
 * derived from the provider payload captured at sync time. */
export interface AccountDto {
  id: string;
  serverId: string;
  cpanelUser: string;
  domain: string | null;
  plan: string | null;
  suspended: boolean;
  diskUsedMb: number | null;
  diskLimitMb: number | null;
  bandwidthUsedMb: number | null;
  bandwidthLimitMb: number | null;
  lastSyncedAt: string | null;
}

export interface AccountMetricsDto {
  diskUsedMb: number | null;
  diskLimitMb: number | null;
  bandwidthUsedMb: number | null;
  bandwidthLimitMb: number | null;
  inodeUsed: number | null;
  emailAccounts: number | null;
  databases: number | null;
  subdomains: number | null;
  addonDomains: number | null;
  parkedDomains: number | null;
  sslStatus: string | null;
  phpVersion: string | null;
  suspended: boolean;
}
