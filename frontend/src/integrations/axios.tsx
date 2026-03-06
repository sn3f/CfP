import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Function to get the OIDC access token from sessionStorage
export function getOidcAccessToken(): string | null {
  try {
    // Construct the sessionStorage key based on your OIDC configuration
    const oidcKey = `oidc.user:${import.meta.env.VITE_OIDC_AUTHORITY}:${import.meta.env.VITE_OIDC_CLIENT_ID}`;
    const oidcData = sessionStorage.getItem(oidcKey);

    if (!oidcData) {
      console.debug('No OIDC data found in sessionStorage');
      return null;
    }

    // Parse the OIDC data
    const parsedData = JSON.parse(oidcData);

    // Check if the token is still valid
    if (parsedData.expires_at && parsedData.expires_at * 1000 < Date.now()) {
      console.debug('OIDC token has expired');
      return null;
    }

    return parsedData.access_token || null;
  } catch (error) {
    console.error('Error parsing OIDC data from sessionStorage:', error);
    return null;
  }
}

// Request interceptor to add auth token
client.interceptors.request.use(
  (config) => {
    const token = getOidcAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor for error handling
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401) {
      // Clear OIDC session data
      const oidcKey = `oidc.user:${import.meta.env.VITE_OIDC_AUTHORITY}:${import.meta.env.VITE_OIDC_CLIENT_ID}`;
      sessionStorage.removeItem(oidcKey);

      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default client;
