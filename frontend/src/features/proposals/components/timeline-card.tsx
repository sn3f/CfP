import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Timeline,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from '@/components/ui/timeline';

export type TimelineCardProps = {
  title: ReactNode;
  description?: string;
  empty?: string;
  icon?: LucideIcon;
  bgClass?: string;
  items: Array<{ date: string; description: string }>;
  className?: string;
};

export function TimelineCard({
  title,
  description,
  empty,
  icon: Icon,
  bgClass = 'bg-chart-4/20',
  items,
  className,
}: TimelineCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <div className={`${bgClass} rounded-full border p-2`} aria-hidden>
            {Icon && <Icon className="size-5 opacity-60" />}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <Timeline defaultValue={items.length}>
            {items.map((item, index) => (
              <TimelineItem key={item.date} step={index + 1}>
                <TimelineHeader>
                  <TimelineSeparator />
                  <TimelineDate>{item.date}</TimelineDate>
                  <TimelineTitle>{item.description}</TimelineTitle>
                  <TimelineIndicator />
                </TimelineHeader>
              </TimelineItem>
            ))}
          </Timeline>
        ) : (
          <span className="text-sm text-muted-foreground">{empty ?? '—'}</span>
        )}
      </CardContent>
    </Card>
  );
}
