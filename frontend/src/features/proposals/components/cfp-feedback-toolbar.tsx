import { useCanGoBack, useNavigate } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CfpAnalysis } from '@/lib/types';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * @name CfpFeedbackToolbar
 * @description Top toolbar for CfP feedback view.
 * Includes back navigation and external actions.
 */
export function CfpFeedbackToolbar({ cfp }: { cfp: CfpAnalysis }) {
  const { t } = useTranslation('translation', { keyPrefix: 'workspace.cfp' });
  const navigate = useNavigate();
  const canGoBack = useCanGoBack();

  return (
    <div className="flex justify-between items-center">
      {/* Back button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="outline"
            disabled={!canGoBack}
            onClick={() =>
              navigate({
                to: '/proposals/$id',
                params: { id: cfp.id.toString() },
              })
            }
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
