import { TanstackDevtools } from '@tanstack/react-devtools';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import {
  Link,
  Outlet,
  createRootRouteWithContext,
  redirect,
} from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { useTranslation } from 'react-i18next';

import type { RouterContext } from '@/integrations/tanstack-router';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';

const PUBLIC_PAGES = ['/login'];

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: ({ location, context }) => {
    const isPublic = PUBLIC_PAGES.includes(location.pathname);
    const isAuthenticated = context.auth?.isAuthenticated ?? false;

    if (!isPublic && !isAuthenticated) {
      throw redirect({
        to: '/login',
      });
    }

    // Handle case where an authenticated user tries to visit the login page
    if (isPublic && isAuthenticated && location.pathname === '/login') {
      throw redirect({
        to: '/',
      });
    }
  },
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});

/**
 * @name RootLayout
 * @description The root layout component that wraps the entire application.
 * It includes the Outlet for rendering child routes and the Tanstack Devtools
 * for debugging both Tanstack Router and Tanstack Query.
 */
function RootLayout() {
  return (
    <div className="antialiased">
      <Outlet />
      {import.meta.env.VITE_SHOW_DEVTOOLS === 'true' && (
        <TanstackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
            {
              name: 'Tanstack Query',
              render: <ReactQueryDevtools />,
            },
          ]}
        />
      )}
    </div>
  );
}

/**
 * @name NotFoundPage
 * @description A simple 404 Not Found page component.
 * This is displayed when the user navigates to a route that does not exist.
 */
function NotFoundPage() {
  const { t } = useTranslation('translation', { keyPrefix: '404' });

  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>{t('title')}</EmptyTitle>
        <EmptyDescription>{t('description')}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <EmptyDescription>
          {t('lost')} <Link to="/">{t('goHome')}</Link>
        </EmptyDescription>
      </EmptyContent>
    </Empty>
  );
}
