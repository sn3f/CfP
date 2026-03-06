import {
  RouterProvider,
  createRouter as createTanstackRouter,
} from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import type { AuthContextProps } from 'react-oidc-context';
import { routeTree } from '@/routeTree.gen';

export type RouterContext = {
  queryClient: QueryClient;
  auth?: AuthContextProps;
};

export function createRouter(context: RouterContext) {
  return createTanstackRouter({
    routeTree,
    context: {
      ...context,
      auth: undefined,
    },
    defaultPreload: 'intent',
    scrollRestoration: true,
    defaultStructuralSharing: true,
    // Since we're using React Query, we don't want loader calls to ever be stale
    // This will ensure that the loader is always called when the route is preloaded or visited
    defaultPreloadStaleTime: 0,
  });
}

export function Provider({
  router,
}: {
  router: ReturnType<typeof createRouter>;
}) {
  return <RouterProvider router={router} />;
}
