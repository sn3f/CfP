import { PencilIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { EditCfpModalField } from '@/features/proposals/components/edit-cfp-modal';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useEditMode } from '@/features/proposals/components/edit-mode-context';

type EditCfpFieldButtonProps = {
  field: EditCfpModalField;
  onEdit: (field: EditCfpModalField) => void;
  tooltip?: string;
  ariaLabel?: string;
};

export function EditCfpFieldButton({
  field,
  onEdit,
  tooltip,
  ariaLabel,
}: EditCfpFieldButtonProps) {
  const { t } = useTranslation();
  const editMode = useEditMode();

  if (!editMode.isEditMode) {
    return null;
  }

  const finalTooltip = tooltip ?? t('workspace.cfp.overview.edit.title');
  const finalAriaLabel = ariaLabel ?? finalTooltip;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={() => onEdit(field)}
          aria-label={finalAriaLabel}
          className="text-muted-foreground"
        >
          <PencilIcon className="size-3" aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{finalTooltip}</TooltipContent>
    </Tooltip>
  );
}
