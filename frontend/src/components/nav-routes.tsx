import { Link, useLocation } from '@tanstack/react-router';
import {
  ArrowLeftRight,
  CloudCog,
  FileCode2,
  TextSearch,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useIsAdmin } from '@/hooks/use-is-admin';

type NavRoute = {
  key: string;
  url: string;
  icon: LucideIcon;
  adminRoleRequired?: boolean;
};

type NavSection = ReadonlyArray<NavRoute>;

const NAV_ROUTES: Record<'MAIN' | 'TOOLS', NavSection> = {
  MAIN: [
    {
      key: 'proposals',
      url: '/proposals',
      icon: TextSearch,
      adminRoleRequired: false,
    },
    {
      key: 'sources',
      url: '/sources',
      icon: CloudCog,
    },
    {
      key: 'criterionTypes',
      url: '/criterion-types',
      icon: ArrowLeftRight,
    },
  ],
  TOOLS: [
    {
      key: 'scrapperResults',
      url: '/scrapper-results',
      icon: FileCode2,
    },
  ],
} as const;

export function NavRoutes() {
  const { t } = useTranslation('translation', { keyPrefix: 'workspace' });
  const { pathname } = useLocation();
  const isAdmin = useIsAdmin();

  const renderSection = (items: NavSection, label: string) => {
    const visibleItems = items.filter((item) => {
      // Default to true if not specified
      const adminRoleRequired = item.adminRoleRequired ?? true;

      return !adminRoleRequired || isAdmin;
    });

    if (visibleItems.length === 0) return null;

    return (
      <>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarMenu>
          {visibleItems.map((item) => (
            <SidebarMenuItem key={item.key}>
              <SidebarMenuButton asChild isActive={pathname === item.url}>
                <Link to={item.url} className="flex items-center gap-2">
                  <item.icon />
                  <span>{t(`routes.${item.key}`)}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </>
    );
  };

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden gap-1">
      {renderSection(NAV_ROUTES.MAIN, t('sidebar.title'))}
      {renderSection(NAV_ROUTES.TOOLS, t('sidebar.tools'))}
    </SidebarGroup>
  );
}
