import { api } from './client';
import type { CreateTokenInput, TokenDto, UpdateTokenInput } from '../types/api.types';

export const tokensApi = {
  listForServer: (serverId: string): Promise<TokenDto[]> =>
    api.get<TokenDto[]>(`/servers/${serverId}/tokens`),
  create: (serverId: string, input: CreateTokenInput): Promise<TokenDto> =>
    api.post<TokenDto>(`/servers/${serverId}/tokens`, input),
  update: (id: string, input: UpdateTokenInput): Promise<TokenDto> =>
    api.patch<TokenDto>(`/tokens/${id}`, input),
  remove: (id: string): Promise<void> => api.del(`/tokens/${id}`),
};
