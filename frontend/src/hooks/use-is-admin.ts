import { useAuth } from 'react-oidc-context';
import type { IdTokenClaims } from 'oidc-client-ts';
import { ADMIN_ROLE } from '@/lib/constants';

/**
 * @name useIsAdmin
 * @description Custom hook to determine if the authenticated user has the 'ADMIN' role.
 * @returns true if the authenticated user has the 'ADMIN' role
 */
export function useIsAdmin(): boolean {
  const auth = useAuth();

  if (auth.isLoading || !auth.user) {
    return false;
  }

  const profile = auth.user.profile as IdTokenClaims & {
    realm_access?: { roles?: Array<string> };
  };

  const roles: Array<string> = profile.realm_access?.roles ?? [];

  return Array.isArray(roles) && roles.includes(ADMIN_ROLE);
}
