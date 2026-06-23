/* [STUB] Request/response contract for the not-yet-implemented FTP module.
 * Defined now so the future implementation and the frontend compile against the
 * final shape. Handlers return NOT_IMPLEMENTED. */
export interface FtpAccountDto {
  user: string;
  homeDir: string;
  quotaMb: number | null;
}
