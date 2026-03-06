import { ChevronDown, LogOut, User2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from 'react-oidc-context';

import { LanguagePicker } from '@/components/language-picker';
import { ModeToggle } from '@/components/mode-toggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

/**
 * @name NavUser
 * @description A navigation component that displays the current user's avatar, name, and email with a dropdown menu.
 */
export function NavUser() {
  const { t } = useTranslation();
  const auth = useAuth();
  const { profile } = auth.user || {};

  const userName =
    profile?.name ||
    profile?.given_name ||
    profile?.preferred_username ||
    'User';
  const userEmail = profile?.email || 'user@example.com';

  const handleLogout = () => {
    auth.signoutRedirect();
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-9 rounded-lg">
                <AvatarFallback className="rounded-lg">
                  <User2 className="size-4 text-primary dark:text-white" />
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-md leading-tight">
                <span className="truncate font-medium">{userName}</span>
                <span className="truncate text-xs">{userEmail}</span>
              </div>
              <ChevronDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width)"
            align="end"
            forceMount
          >
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center space-x-2">
                <Avatar className="size-9 rounded-lg">
                  <AvatarFallback className="rounded-lg">
                    <User2 className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-md leading-tight">
                  <span className="truncate font-medium">{userName}</span>
                  <span className="truncate text-xs">{userEmail}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-sm flex justify-between items-center">
              <span>{t('workspace.sidebar.language')}</span>
              <LanguagePicker className="h-7" />
            </div>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-sm flex justify-between items-center">
              <span>{t('theme.title')}</span>
              <ModeToggle />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={handleLogout}
              className="cursor-pointer"
            >
              <LogOut className="mr-2 size-4" />
              <span>{t('workspace.sidebar.logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
