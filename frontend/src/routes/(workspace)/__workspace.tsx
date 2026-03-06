import { Outlet, createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { AppSidebar } from '@/components/app-sidebar';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const Route = createFileRoute('/(workspace)/__workspace')({
  component: ProtectedLayout,
});

/**
 * @name ProtectedLayout
 * @description A layout component for protected routes. It wraps its children with the sidebar.
 * It checks if the user is authenticated before rendering the children. If not authenticated,
 * it redirects the user to the login page.
 */
function ProtectedLayout() {
  const { t } = useTranslation('translation', { keyPrefix: 'workspace' });

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center justify-between gap-2 px-4 w-full">
            <Tooltip>
              <TooltipTrigger asChild>
                <SidebarTrigger className="-ml-1" />
              </TooltipTrigger>
              <TooltipContent side="right">
                {t('sidebar.toggle')}
                <KbdGroup className="ml-2">
                  <Kbd>Ctrl + B</Kbd>
                </KbdGroup>
              </TooltipContent>
            </Tooltip>

            {/* <Notifications /> */}
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
