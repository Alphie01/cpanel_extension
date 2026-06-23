/* Reads the permission set the host injects for the current session. Components
 * use has(...) to gate menus, actions, and routes. Never trusts client input for
 * authorization — this is presentation-only; the backend re-checks every call. */
import { PERMISSIONS } from '../../shared/constants/permissions';

interface HostSession {
  permissions?: string[];
}

interface HostWindow extends Window {
  __RELATION_SESSION__?: HostSession;
}

export interface PermissionApi {
  permissions: string[];
  has: (permission: string) => boolean;
}

export function usePermissions(): PermissionApi {
  const session = (window as HostWindow).__RELATION_SESSION__;
  const permissions = session?.permissions ?? [];
  const has = (permission: string): boolean =>
    permissions.includes(permission) || permissions.includes(PERMISSIONS.admin);
  return { permissions, has };
}
