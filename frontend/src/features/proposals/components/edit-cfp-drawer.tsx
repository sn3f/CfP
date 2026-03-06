import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { CfpAnalysis } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Field, FieldGroup, FieldLabel, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { TagsInputField } from '@/features/proposals/components/tags-input-field';

import { updateCfpAnalysisApi } from '@/features/proposals/lib/api';
import { useIsMobile } from '@/hooks/use-mobile';
import { cfpAnalysesKeys } from '@/lib/key-factory';
import { cn } from '@/lib/utils';

type EditCfpDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cfp: CfpAnalysis;
  onSuccess?: () => void;
};

export function EditCfpDrawer({
  open,
  onOpenChange,
  cfp,
  onSuccess,
}: EditCfpDrawerProps) {
  const { t } = useTranslation('translation', { keyPrefix: 'workspace.cfp' });
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: '',
    organization: '',
    regions: [] as Array<string>,
    country: [] as Array<string>,
    theme: [] as Array<string>,
    deadline: undefined as Date | undefined,
    funding_currency: '',
    funding_min: '' as string | number,
    funding_max: '' as string | number,
    contact: '',
    match: '' as string | number,
    matchEvidence: '',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        title: cfp.extractedData.title || '',
        organization: cfp.extractedData.organization || '',
        regions: cfp.extractedData.regions || [],
        country: cfp.extractedData.country || [],
        theme: cfp.extractedData.theme || [],
        deadline: cfp.deadline ? new Date(cfp.deadline) : undefined,
        funding_currency: cfp.extractedData.funding_currency || 'USD',
        funding_min: cfp.extractedData.funding_min || '',
        funding_max: cfp.extractedData.funding_max || '',
        contact: cfp.extractedData.contact || '',
        match:
          cfp.extractedData.match?.value != null
            ? Math.round(cfp.extractedData.match.value * 100)
            : '',
        matchEvidence: cfp.extractedData.match?.evidence || '',
      });
    }
  }, [open, cfp]);

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Partial<CfpAnalysis>) =>
      updateCfpAnalysisApi(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cfpAnalysesKeys.all });
      toast.success(t('toasts.updateSuccess'));
      onOpenChange(false);
      onSuccess?.();
    },
    onError: () => {
      toast.error(t('toasts.updateError'));
    },
  });

  const handleSave = async () => {
    const matchValue =
      formData.match !== '' ? Number(formData.match) / 100 : null;

    const extractedData = {
      ...cfp.extractedData,
      title: formData.title,
      organization: formData.organization,
      regions: formData.regions,
      country: formData.country,
      theme: formData.theme,
      funding_currency: formData.funding_currency,
      funding_min: formData.funding_min ? Number(formData.funding_min) : null,
      funding_max: formData.funding_max ? Number(formData.funding_max) : null,
      contact: formData.contact,
      match: {
        value: matchValue,
        evidence: formData.matchEvidence,
      },
    };

    const formattedDeadline = formData.deadline
      ? format(formData.deadline, 'yyyy-MM-dd')
      : undefined;

    await updateMutation.mutateAsync({
      ...cfp,
      extractedData,
      deadline: formattedDeadline,
      match: matchValue ?? undefined,
    });
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction={isMobile ? 'bottom' : 'right'}
      dismissible={false}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{t('actions.editCfp')}</DrawerTitle>
          <DrawerDescription>
            {t('actions.editCfpDescription')}
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4 overflow-y-auto max-h-[calc(100vh-12rem)] space-y-4">
          <FieldGroup>
            <FieldSet>
              <Field>
                <FieldLabel htmlFor="edit-organization">
                  {t('columns.organization')}
                </FieldLabel>
                <Input
                  id="edit-organization"
                  value={formData.organization}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      organization: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-title">
                  {t('columns.title')}
                </FieldLabel>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel>{t('columns.region')}</FieldLabel>
                <TagsInputField
                  value={formData.regions}
                  onChange={(tags) =>
                    setFormData((prev) => ({ ...prev, regions: tags }))
                  }
                  variant="minimal"
                />
              </Field>
              <Field>
                <FieldLabel>{t('columns.country')}</FieldLabel>
                <TagsInputField
                  value={formData.country}
                  onChange={(tags) =>
                    setFormData((prev) => ({ ...prev, country: tags }))
                  }
                  variant="minimal"
                />
              </Field>
              <Field>
                <FieldLabel>{t('columns.themes')}</FieldLabel>
                <TagsInputField
                  value={formData.theme}
                  onChange={(tags) =>
                    setFormData((prev) => ({ ...prev, theme: tags }))
                  }
                  variant="minimal"
                />
              </Field>
              <Field>
                <FieldLabel>{t('columns.deadline')}</FieldLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !formData.deadline && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.deadline ? (
                        format(formData.deadline, 'PPP')
                      ) : (
                        <span>{t('filters.selectDeadline')}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.deadline}
                      onSelect={(date) =>
                        setFormData((prev) => ({ ...prev, deadline: date }))
                      }
                    />
                  </PopoverContent>
                </Popover>
              </Field>
              <Field>
                <FieldLabel>{t('columns.fundingAmount')}</FieldLabel>
                <div className="flex gap-2">
                  <div className="w-24 shrink-0">
                    <Input
                      placeholder="USD"
                      value={formData.funding_currency}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          funding_currency: e.target.value,
                        }))
                      }
                      className="uppercase"
                      maxLength={3}
                    />
                  </div>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-muted-foreground text-xs font-medium">
                      Min
                    </span>
                    <Input
                      type="number"
                      className="pl-9"
                      value={formData.funding_min}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          funding_min: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    -
                  </div>
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-muted-foreground text-xs font-medium">
                      Max
                    </span>
                    <Input
                      type="number"
                      className="pl-10"
                      value={formData.funding_max}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          funding_max: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-contact">
                  {t('columns.contact')}
                </FieldLabel>
                <Input
                  id="edit-contact"
                  value={formData.contact}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      contact: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-match">
                  {t('columns.match')} (%)
                </FieldLabel>
                <Input
                  id="edit-match"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.match}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || (Number(val) >= 0 && Number(val) <= 100)) {
                      setFormData((prev) => ({
                        ...prev,
                        match: val,
                      }));
                    }
                  }}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-match-evidence">
                  {t('columns.evidence')}
                </FieldLabel>
                <Textarea
                  id="edit-match-evidence"
                  value={formData.matchEvidence}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      matchEvidence: e.target.value,
                    }))
                  }
                  rows={4}
                />
              </Field>
            </FieldSet>
          </FieldGroup>
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              {t('actions.cancel')}
            </Button>
          </DrawerClose>
          <Button
            onClick={handleSave}
            disabled={!formData.title.trim() || updateMutation.isPending}
          >
            {updateMutation.isPending ? t('actions.saving') : t('actions.save')}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
