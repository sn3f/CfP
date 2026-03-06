import { Ban } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

type EmptyTableStateProps = {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  children?: React.ReactNode;
};

export function EmptyTableState({
  icon: Icon,
  title,
  description,
  children,
}: EmptyTableStateProps) {
  const { t } = useTranslation('translation', { keyPrefix: 'workspace.table' });

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">{Icon ? <Icon /> : <Ban />}</EmptyMedia>
        <EmptyTitle>{title ?? t('noResults')}</EmptyTitle>
        <EmptyDescription>
          {description ?? t('noResultsDetails')}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>{children}</EmptyContent>
    </Empty>
  );
}
