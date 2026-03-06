import { useTranslation } from 'react-i18next';

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Logo } from '@/components/logo';

export function LoadingCard() {
  const { t } = useTranslation('translation', {
    keyPrefix: 'auth.loadingCard',
  });

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <Logo className="h-16 mx-auto" />

      <Card>
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
          <CardAction>
            <Spinner className="text-primary size-6" />
          </CardAction>
        </CardHeader>
        <CardContent>{t('details')}</CardContent>
      </Card>
    </div>
  );
}
