/* Domain API contracts (shared backend + frontend). */
export type DomainType = 'main' | 'addon' | 'subdomain' | 'parked';

export interface DomainDto {
  domain: string;
  type: DomainType;
  sslStatus: string | null;
}
