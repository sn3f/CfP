import { BellIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const initialNotifications = [
  {
    id: 1,
    user: 'AI Classifier',
    action: 'scanned',
    target: 'Government RFP Portal and found 12 new proposals',
    timestamp: '2 minutes ago',
    unread: true,
  },
  {
    id: 2,
    user: 'Source Monitor',
    action: 'detected',
    target: '3 high-priority proposals in Healthcare sector',
    timestamp: '15 minutes ago',
    unread: true,
  },
  {
    id: 3,
    user: 'Classification Engine',
    action: 'completed analysis of',
    target: 'Proposal #RFP-2024-089 (IT Infrastructure)',
    timestamp: '1 hour ago',
    unread: true,
  },
  {
    id: 4,
    user: 'Alert System',
    action: 'flagged',
    target: 'Proposal deadline approaching in 48 hours',
    timestamp: '3 hours ago',
    unread: false,
  },
  {
    id: 5,
    user: 'Data Crawler',
    action: 'indexed',
    target: 'Federal Business Opportunities - 8 new entries',
    timestamp: '6 hours ago',
    unread: false,
  },
  {
    id: 6,
    user: 'ML Model',
    action: 'updated confidence scores for',
    target: 'Construction & Engineering proposals',
    timestamp: '12 hours ago',
    unread: false,
  },
  {
    id: 7,
    user: 'Source Validator',
    action: 'verified',
    target: 'State procurement portal connection',
    timestamp: '1 day ago',
    unread: false,
  },
  {
    id: 8,
    user: 'Keyword Matcher',
    action: 'found matches for',
    target: 'AI/ML keywords in 5 new proposals',
    timestamp: '2 days ago',
    unread: false,
  },
];

function Dot({ className }: { className?: string }) {
  return (
    <svg
      width="6"
      height="6"
      fill="currentColor"
      viewBox="0 0 6 6"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="3" cy="3" r="3" />
    </svg>
  );
}

export function Notifications() {
  const { t } = useTranslation('translation', { keyPrefix: 'notifications' });
  const [notifications, setNotifications] = useState(initialNotifications);
  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleMarkAllAsRead = () => {
    setNotifications(
      notifications.map((notification) => ({
        ...notification,
        unread: false,
      })),
    );
  };

  const handleNotificationClick = (id: number) => {
    setNotifications(
      notifications.map((notification) =>
        notification.id === id
          ? { ...notification, unread: false }
          : notification,
      ),
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="relative bg-transparent"
          aria-label={t('open')}
        >
          <BellIcon size={16} aria-hidden="true" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 left-full min-w-5 -translate-x-1/2 px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-1" side="bottom" align="end">
        <div className="flex items-baseline justify-between gap-4 px-3 py-2">
          <div className="text-sm font-semibold">{t('title')}</div>
          {unreadCount > 0 && (
            <button
              className="text-xs font-medium hover:underline"
              onClick={handleMarkAllAsRead}
            >
              {t('markAllAsRead')}
            </button>
          )}
        </div>
        <div
          role="separator"
          aria-orientation="horizontal"
          className="bg-border -mx-1 my-1 h-px"
        ></div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="hover:bg-accent rounded-md px-3 py-2 text-sm transition-colors"
            >
              <div className="relative flex items-start pe-3">
                <div className="flex-1 space-y-1">
                  <button
                    className="text-left after:absolute after:inset-0"
                    onClick={() => handleNotificationClick(notification.id)}
                  >
                    <span className="text-foreground font-medium hover:underline">
                      {notification.user}
                    </span>{' '}
                    {notification.action}{' '}
                    <span className="text-foreground font-medium hover:underline">
                      {notification.target}
                    </span>
                    .
                  </button>
                  <div className="text-muted-foreground text-xs">
                    {notification.timestamp}
                  </div>
                </div>
                {notification.unread && (
                  <div className="absolute end-0 self-center">
                    <span className="sr-only">{t('unread')}</span>
                    <Dot />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
