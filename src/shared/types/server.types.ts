/* Server API contract (no secrets, no internal columns leaked). */
export type ServerStatus = 'ACTIVE' | 'INACTIVE' | 'UNREACHABLE';

export interface ServerDto {
  id: string;
  name: string;
  hostname: string;
  port: number;
  status: ServerStatus;
  verifySsl: boolean;
  lastCheckedAt: string | null;
  lastError: string | null;
  notes: string | null;
  tokenCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TestConnectionResult {
  ok: boolean;
  status: ServerStatus;
  whmVersion: string | null;
  message: string;
  checkedAt: string;
}
