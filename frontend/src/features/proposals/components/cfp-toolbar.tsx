import {
  useCanGoBack,
  useNavigate,
  useRouter,
} from '@tanstack/react-router';
import { format } from 'date-fns';
import {
  ChevronLeft,
  PencilIcon,
  RecycleIcon,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { CfpAnalysis } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Toggle } from '@/components/ui/toggle';
import { ReclassifyCfpDrawer } from '@/features/proposals/components/reclassify-cfp-drawer.tsx';
import { useEditMode } from '@/features/proposals/components/edit-mode-context';

/**
 * @name CfpToolbar
 * @description Top toolbar for CfP details view.
 * Includes back navigation, feedback link, and external actions.
 */
export function CfpToolbar({ cfp }: { cfp: CfpAnalysis }) {
  const { t } = useTranslation('translation', { keyPrefix: 'workspace.cfp' });
  const router = useRouter();
  const navigate = useNavigate();
  const canGoBack = useCanGoBack();
  const { isEditMode, setIsEditMode } = useEditMode();

  const [isReclassifyOpen, setIsReclassifyOpen] = useState(false);

  return (
    <>
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

        {/* Right side actions */}
        <div className="inline-flex items-center gap-2">
          <Toggle
            pressed={isEditMode}
            onPressedChange={setIsEditMode}
            variant="outline"
            size="default"
            aria-label={t('actions.editMode')}
          >
            <PencilIcon className="size-4" aria-hidden="true" />
            <span>{t('actions.edit')}</span>
          </Toggle>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setIsReclassifyOpen(true)}
              >
                <RecycleIcon size={16} aria-hidden="true" />
                <span className="sr-only">{t('actions.reclassify')}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {t('actions.reclassify')}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <ReclassifyCfpDrawer
        open={isReclassifyOpen}
        onOpenChange={setIsReclassifyOpen}
        cfpAnalysis={cfp}
        onSuccess={() =>
          navigate({
            to: '/proposals',
            search: (prev) => ({
              ...prev,
              page: prev.page ?? 0,
              size: prev.size ?? 10,
              eligible: prev.eligible ?? 'true',
              deadline: prev.deadline ?? format(new Date(), 'yyyy-MM-dd'),
            }),
          })
        }
      />
    </>
  );
}
