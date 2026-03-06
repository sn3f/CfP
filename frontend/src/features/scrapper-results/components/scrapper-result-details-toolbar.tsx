import { useCanGoBack, useRouter } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * @name ScrapperResultDetailsToolbar
 * @description Top toolbar for Scrapper Result details view.
 */
export function ScrapperResultDetailsToolbar() {
  const { t } = useTranslation('translation', { keyPrefix: 'scrapperResults' });
  const canGoBack = useCanGoBack();
  const router = useRouter();

  return (
    <div className="flex justify-between items-center">
      {/* Back button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="outline"
            disabled={!canGoBack}
            onClick={() => router.history.back()}
          >
            <ChevronLeft size={16} aria-hidden="true" />
            <span className="sr-only">{t('back')}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t('back')}</TooltipContent>
      </Tooltip>
    </div>
  );
}
