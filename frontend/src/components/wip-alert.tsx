import { InfoIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function WipAlert() {
  const { t } = useTranslation('translation', {
    keyPrefix: 'system.wip',
  });

  return (
    <div className="bg-sidebar/5 dark:bg-sidebar/25 border border-sidebar/25 dark:border-sidebar rounded-md px-4 py-3 text-foreground">
      <div className="flex gap-2 md:items-center">
        <div className="flex grow gap-3 md:items-center">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/20 max-md:mt-0.5"
            aria-hidden="true"
          >
            <InfoIcon className="text-primary" size={16} strokeWidth={3} />
          </div>

          <div className="flex grow flex-col justify-between gap-3 md:flex-row md:items-center">
            <div className="space-y-0.5">
              <p className="text-sm font-normal text-primary">{t('title')}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t('description')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
