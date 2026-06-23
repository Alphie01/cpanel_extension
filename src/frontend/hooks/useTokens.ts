import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from '@tanstack/react-query';
import { tokensApi } from '../api/tokens.api';
import type { CreateTokenInput, TokenDto, UpdateTokenInput } from '../types/api.types';

export function useTokens(serverId: string | undefined): UseQueryResult<TokenDto[]> {
  return useQuery({
    queryKey: ['hosting', 'tokens', serverId],
    queryFn: () => tokensApi.listForServer(serverId!),
    enabled: Boolean(serverId),
  });
}

export function useCreateToken(serverId: string): UseMutationResult<TokenDto, unknown, CreateTokenInput> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTokenInput) => tokensApi.create(serverId, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['hosting', 'tokens', serverId] }),
  });
}

export function useUpdateToken(serverId: string): UseMutationResult<TokenDto, unknown, { id: string; input: UpdateTokenInput }> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTokenInput }) => tokensApi.update(id, input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['hosting', 'tokens', serverId] }),
  });
}

export function useDeleteToken(serverId: string): UseMutationResult<void, unknown, string> {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => tokensApi.remove(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['hosting', 'tokens', serverId] }),
  });
}
