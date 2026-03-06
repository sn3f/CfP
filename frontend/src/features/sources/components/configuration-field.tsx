import { ChevronRightIcon, Settings2Icon } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import type { ConfigurationStep } from '@/features/sources/lib/types';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type ConfigurationFieldProps = {
  value: string;
  onEdit: () => void;
  className?: string;
};

export function ConfigurationField({
  value,
  onEdit,
  className,
}: ConfigurationFieldProps) {
  const { t } = useTranslation('translation', { keyPrefix: 'sources' });

  const steps = React.useMemo<Array<ConfigurationStep>>(() => {
    try {
      const parsed = JSON.parse(value);
      return parsed.steps || [];
    } catch {
      return [];
    }
  }, [value]);

  const visibleSteps = steps.filter((s) => s.operation !== 'SCRAP');
  const hasVisibleSteps = visibleSteps.length > 0;

  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-sm font-medium text-foreground">
        {t('dialogs.form.advancedConfig')}
      </Label>

      <button
        type="button"
        aria-label={t('dialogs.form.advancedConfig')}
        onClick={onEdit}
        className={cn(
          'group flex w-full items-center justify-between rounded-md border border-border bg-card/80 px-3 py-2.5 text-left transition-all hover:bg-accent/50 hover:border-primary/40',
          !hasVisibleSteps && 'border-dashed text-muted-foreground',
        )}
      >
        {/* Left Section */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Settings2Icon className="h-4 w-4 shrink-0 text-muted-foreground" />

          {hasVisibleSteps ? (
            <div className="flex items-center gap-0.5 flex-wrap">
              {visibleSteps.map((step, i) => (
                <Badge
                  key={step.name}
                  variant="secondary"
                  className="text-[11px] font-normal text-muted-foreground"
                >
                  {i + 1}. {step.operation}
                </Badge>
              ))}
            </div>
          ) : (
            <span className="text-sm truncate">
              {t('dialogs.form.noStepsConfigured')}
            </span>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1.5 shrink-0">
          {hasVisibleSteps ? (
            <span className="text-xs text-muted-foreground">
              {visibleSteps.length}{' '}
              {t(
                visibleSteps.length === 1
                  ? 'dialogs.form.stepSingular'
                  : 'dialogs.form.stepPlural',
              )}
            </span>
          ) : null}
          <ChevronRightIcon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </button>
    </div>
  );
}
