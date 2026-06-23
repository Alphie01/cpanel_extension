import { api } from './client';
import type { DomainDto } from '../types/api.types';

export const domainsApi = {
  list: (accountId: string): Promise<DomainDto[]> =>
    api.get<DomainDto[]>(`/accounts/${accountId}/domains`),
  autoSsl: (accountId: string): Promise<{ ok: boolean }> =>
    api.post<{ ok: boolean }>(`/accounts/${accountId}/domains/autossl`, {}),
};
