import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { emailsApi } from '../api/emails.api';
import type { CreateEmailAccountRequest, EmailAccountDto } from '../types/api.types';

export function useEmails(accountId: string | undefined): UseQueryResult<EmailAccountDto[]> {
  return useQuery({
    queryKey: ['hosting', 'emails', accountId],
    queryFn: () => emailsApi.list(accountId!),
    enabled: Boolean(accountId),
  });
}

export function useCreateEmail(accountId: string): UseMutationResult<EmailAccountDto, unknown, CreateEmailAccountRequest> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEmailAccountRequest) => emailsApi.create(accountId, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['hosting', 'emails', accountId] }),
  });
}

export function useDeleteEmail(accountId: string): UseMutationResult<void, unknown, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => emailsApi.remove(accountId, email),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['hosting', 'emails', accountId] }),
  });
}
