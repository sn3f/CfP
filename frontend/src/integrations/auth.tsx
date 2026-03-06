import { UserManager } from 'oidc-client-ts';
import { AuthProvider } from 'react-oidc-context';

// OIDC Client configuration for react-oidc-context
// Values come from Vite environment variables (prefixed with VITE_)
const oidcConfig = {
  // Identity Provider base URL (Azure B2C authority endpoint)
  authority: import.meta.env.VITE_OIDC_AUTHORITY,

  // Frontend application client ID from IdP registration
  client_id: import.meta.env.VITE_OIDC_CLIENT_ID,

  // Redirect URI used for IdP callback after login
  // Must exactly match what you registered in IdP
  redirect_uri: import.meta.env.VITE_OIDC_REDIRECT_URI,

  // Scopes requested during login
  // 'openid profile email' are standard OIDC scopes
  // Add API scopes as needed
  scope: import.meta.env.VITE_OIDC_SCOPE,

  // Fetch additional user info after login
  loadUserInfo: true,

  // Post logout redirect URI
  post_logout_redirect_uri: import.meta.env.VITE_OIDC_POST_LOGOUT_REDIRECT_URI,
};

export const userManager = new UserManager(oidcConfig);

// Provide an auth context wrapper just like Query’s one
export function Provider({ children }: { children: React.ReactNode }) {
  return <AuthProvider {...oidcConfig}>{children}</AuthProvider>;
}
