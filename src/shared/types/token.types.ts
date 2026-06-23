/* Token API contract. The raw token value is WRITE-ONLY: it is never present in
 * any response. Only `lastFour` is exposed as a display hint. */
export type TokenScope = 'WHM' | 'CPANEL';

export interface TokenDto {
  id: string;
  serverId: string;
  label: string;
  scope: TokenScope;
  whmUser: string;
  cpanelUser: string | null;
  lastFour: string | null;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
