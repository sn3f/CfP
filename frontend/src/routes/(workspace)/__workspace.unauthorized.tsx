import { createFileRoute, useRouter } from '@tanstack/react-router';
import { ChevronLeft, ShieldOffIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

export const Route = createFileRoute('/(workspace)/__workspace/unauthorized')({
  component: UnauthorizedPage,
});

function UnauthorizedPage() {
  const { t } = useTranslation('translation', { keyPrefix: '403' });
  const router = useRouter();

  return (
    <div className="flex size-full items-center justify-center p-4">
      <Empty className="max-w-md border border-dashed bg-sidebar/5 border-sidebar/25">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ShieldOffIcon />
          </EmptyMedia>
          <EmptyTitle className="text-xl">{t('title')}</EmptyTitle>
          <EmptyDescription className="text-pretty">
            {t('description')}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" onClick={() => router.history.back()}>
            <ChevronLeft className="size-4" />
            {t('goBack')}
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
