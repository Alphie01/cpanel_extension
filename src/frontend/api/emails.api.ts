import { api } from './client';
import type {
  CreateEmailAccountRequest,
  EmailAccountDto,
  UpdateEmailAccountRequest,
} from '../types/api.types';

export const emailsApi = {
  list: (accountId: string): Promise<EmailAccountDto[]> =>
    api.get<EmailAccountDto[]>(`/accounts/${accountId}/email-accounts`),
  create: (accountId: string, input: CreateEmailAccountRequest): Promise<EmailAccountDto> =>
    api.post<EmailAccountDto>(`/accounts/${accountId}/email-accounts`, input),
  update: (accountId: string, email: string, input: UpdateEmailAccountRequest): Promise<EmailAccountDto> =>
    api.patch<EmailAccountDto>(
      `/accounts/${accountId}/email-accounts/${encodeURIComponent(email)}`,
      input,
    ),
  remove: (accountId: string, email: string): Promise<void> =>
    api.del(`/accounts/${accountId}/email-accounts/${encodeURIComponent(email)}`),
};
