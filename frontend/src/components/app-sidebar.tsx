import { Link } from '@tanstack/react-router';
import { format } from 'date-fns';
import * as React from 'react';

import { Logo } from '@/components/logo';
import { NavRoutes } from '@/components/nav-routes';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="logo" asChild>
              <Link
                to="/proposals"
                search={{
                  page: 0,
                  size: 10,
                  eligible: 'true',
                  deadline: format(new Date(), 'yyyy-MM-dd'),
                }}
              >
                <Logo className="ml-2" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavRoutes />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
