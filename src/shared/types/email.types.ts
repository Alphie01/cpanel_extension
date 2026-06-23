/* Email account API contracts (shared backend + frontend). Passwords are
 * write-only — never returned in any response. */
export interface EmailAccountDto {
  email: string;
  quotaMb: number | null;
  usedMb: number | null;
  suspended: boolean;
}

export interface CreateEmailAccountRequest {
  user: string;
  domain: string;
  password: string;
  quotaMb: number;
}

export interface UpdateEmailAccountRequest {
  password?: string;
  quotaMb?: number;
  suspended?: boolean;
}
