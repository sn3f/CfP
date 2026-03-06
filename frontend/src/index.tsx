import '@/styles.css';

import { RouterProvider } from '@tanstack/react-router';
import { StrictMode, useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { hasAuthParams, useAuth } from 'react-oidc-context';

import { LoadingCard } from '@/features/auth/components/loading-card';

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import * as Auth from '@/integrations/auth';
import * as TanStackQuery from '@/integrations/tanstack-query';
import * as TanStackRouter from '@/integrations/tanstack-router';

// Import the generated route tree
import '@/routeTree.gen';

// Import and initialize i18n (internationalization)
import '@/integrations/i18n';

// Create the TanStack Query client and TanStack Router router
const queryContext = TanStackQuery.getContext();
const router = TanStackRouter.createRouter(queryContext);

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
    context: TanStackRouter.RouterContext;
  }
}

function App() {
  const auth = useAuth();
  const [hasTriedSilentSignIn, setHasTriedSilentSignIn] = useState(false);

  // Update the router context with the latest auth state
  router.update({
    context: {
      ...router.options.context,
      auth,
    },
  });

  useEffect(() => {
    if (
      !hasAuthParams() &&
      !auth.isAuthenticated &&
      !auth.activeNavigator &&
      !auth.isLoading &&
      !hasTriedSilentSignIn
    ) {
      auth.signinSilent();
      setHasTriedSilentSignIn(true);
    }
  }, [auth, hasTriedSilentSignIn]);

  if (auth.isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoadingCard />
      </div>
    );
  }

  return <RouterProvider router={router} />;
}

// Render the app
const rootElement = document.getElementById('root');
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <StrictMode>
      <Auth.Provider>
        <TanStackQuery.Provider {...queryContext}>
          <ThemeProvider>
            <App />
            <Toaster position="top-right" richColors />
          </ThemeProvider>
        </TanStackQuery.Provider>
      </Auth.Provider>
    </StrictMode>,
  );
}
