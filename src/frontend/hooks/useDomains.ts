import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { domainsApi } from '../api/domains.api';
import type { DomainDto } from '../types/api.types';

export function useDomains(accountId: string | undefined): UseQueryResult<DomainDto[]> {
  return useQuery({
    queryKey: ['hosting', 'domains', accountId],
    queryFn: () => domainsApi.list(accountId!),
    enabled: Boolean(accountId),
  });
}

export function useTriggerAutoSsl(accountId: string): UseMutationResult<{ ok: boolean }, unknown, void> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => domainsApi.autoSsl(accountId),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['hosting', 'domains', accountId] }),
  });
}
