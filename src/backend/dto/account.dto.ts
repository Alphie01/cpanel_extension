/* Maps an account row to its public DTOs, deriving numeric metrics from the
 * WHM payload captured at sync time (rawJson). No secrets are involved. */
import type { AccountDto, AccountMetricsDto } from '../../shared/types/account.types';
import type { AccountRow } from '../repositories/hosting-prisma';
import { parseMb } from '../utils/whm-account-parse';

function raw(row: AccountRow): Record<string, unknown> {
  return row.rawJson && typeof row.rawJson === 'object' ? (row.rawJson as Record<string, unknown>) : {};
}

export function toAccountDto(row: AccountRow): AccountDto {
  const r = raw(row);
  return {
    id: row.id,
    serverId: row.serverId,
    cpanelUser: row.cpanelUser,
    domain: row.domain,
    plan: row.plan,
    suspended: row.suspended,
    diskUsedMb: parseMb(r.diskused),
    diskLimitMb: parseMb(r.disklimit),
    bandwidthUsedMb: parseMb(r.totalbytes ?? r.bwused),
    bandwidthLimitMb: parseMb(r.bwlimit ?? r.totalbwallocated),
    lastSyncedAt: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : null,
  };
}

export function toAccountMetricsDto(row: AccountRow): AccountMetricsDto {
  const r = raw(row);
  const num = (value: unknown): number | null => {
    const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    return Number.isFinite(n) ? n : null;
  };
  return {
    diskUsedMb: parseMb(r.diskused),
    diskLimitMb: parseMb(r.disklimit),
    bandwidthUsedMb: parseMb(r.totalbytes ?? r.bwused),
    bandwidthLimitMb: parseMb(r.bwlimit ?? r.totalbwallocated),
    inodeUsed: num(r.inodesused),
    emailAccounts: num(r.email_accounts ?? r.emailaccounts),
    databases: num(r.mysql_databases),
    subdomains: num(r.subdomains),
    addonDomains: num(r.addon_domains ?? r.maxaddons),
    parkedDomains: num(r.parked_domains ?? r.maxparked),
    sslStatus: typeof r.ssl === 'string' ? r.ssl : null,
    phpVersion: typeof r.phpversion === 'string' ? r.phpversion : null,
    suspended: row.suspended,
  };
}
