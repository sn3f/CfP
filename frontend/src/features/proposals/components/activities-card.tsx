import { Check, X } from 'lucide-react';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';

import type { Criterion } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from '@/components/ui/item';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type ActivitiesCardProps = {
  title: React.ReactNode;
  description: string;
  items: Array<Criterion>;
  emptyText: string;
  icon: React.ReactNode;
  iconBgClass?: string;
  className?: string;
};

export function ActivitiesCard({
  title,
  description,
  items,
  emptyText,
  icon,
  iconBgClass = 'bg-muted/50',
  className,
}: ActivitiesCardProps) {
  const { t } = useTranslation('translation', { keyPrefix: 'workspace.cfp' });

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction>
          <div className={cn('border rounded-full p-2', iconBgClass)}>
            {icon}
          </div>
        </CardAction>
      </CardHeader>

      <CardContent className="grid grid-cols-1 gap-1">
        <ItemGroup>
          {items.length > 0 ? (
            <Fragment>
              {items.map((item, index) => {
                const isMet = item.status === true || item.status === 'true';
                const isHard = !!item.type.hard;

                return (
                  <div key={item.id}>
                    <Item
                      className={cn({
                        'opacity-90': !isHard,
                      })}
                      size="sm"
                    >
                      <ItemContent>
                        <ItemTitle>
                          {item.type.fieldName}
                          {isHard && (
                            <Badge className="gap-1 font-normal px-2 bg-primary/5 text-primary border-primary/30">
                              {t('overview.criteria.hard')}
                            </Badge>
                          )}
                        </ItemTitle>
                        <ItemDescription>{item.evidence}</ItemDescription>
                      </ItemContent>
                      <ItemActions>
                        {isMet ? (
                          <div
                            className="p-3 rounded-full bg-success/15 dark:bg-success/10"
                            title={t('overview.criteria.met')}
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Check className="size-4 text-emerald-600" />
                              </TooltipTrigger>
                              <TooltipContent>
                                {t('overview.criteria.met')}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        ) : (
                          <div
                            className="p-3 rounded-full bg-destructive/10"
                            title={t('overview.criteria.notMet')}
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <X className="size-4 text-destructive" />
                              </TooltipTrigger>
                              <TooltipContent>
                                {t('overview.criteria.notMet')}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        )}
                      </ItemActions>
                    </Item>
                    {index !== items.length - 1 && <ItemSeparator />}
                  </div>
                );
              })}
            </Fragment>
          ) : (
            <p className="text-sm text-muted-foreground italic text-center py-4">
              {emptyText}
            </p>
          )}
        </ItemGroup>
      </CardContent>
    </Card>
  );
}
