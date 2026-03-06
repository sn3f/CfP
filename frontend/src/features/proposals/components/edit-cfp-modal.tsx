import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { ApplicationProcessItem } from '@/features/proposals/components/application-process-input-field';
import type { CfpAnalysis, Criterion } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { ApplicationProcessInputField } from '@/features/proposals/components/application-process-input-field';
import { CriteriaInputField } from '@/features/proposals/components/criteria-input-field';
import { ListInputField } from '@/features/proposals/components/list-input-field';
import { TagsInputField } from '@/features/proposals/components/tags-input-field';
import { updateCfpAnalysisApi } from '@/features/proposals/lib/api';
import { cfpAnalysesKeys } from '@/lib/key-factory';

export type EditCfpModalField = {
  scope: 'extractedData' | 'root';
  field: string;
  title?: string;
  description?: string;
  placeholder?: string;
  variant?:
  | 'string'
  | 'date'
  | 'tags'
  | 'fundingRange'
  | 'list'
  | 'applicationProcess'
  | 'additionalInfoCriteria'
  | 'criteriaByFieldName'
  | 'match';
  criterionFieldName?: string | Array<string>;
};

type EditCfpModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cfp: CfpAnalysis;
  activeField: EditCfpModalField | null;
};

export function EditCfpModal({
  open,
  onOpenChange,
  cfp,
  activeField,
}: EditCfpModalProps) {
  const { t } = useTranslation('translation', { keyPrefix: 'workspace.cfp' });
  const queryClient = useQueryClient();

  const initialValue = useMemo(() => {
    if (!activeField) return '';

    const source: Record<string, unknown> =
      activeField.scope === 'root'
        ? (cfp as unknown as Record<string, unknown>)
        : (cfp.extractedData as unknown as Record<string, unknown>);

    const raw = source[activeField.field];
    return typeof raw === 'string' ? raw : '';
  }, [activeField, cfp]);

  const [value, setValue] = useState('');
  const [dateValue, setDateValue] = useState<Date | undefined>(undefined);
  const [tagsValue, setTagsValue] = useState<Array<string>>([]);
  const [listValue, setListValue] = useState<Array<string>>([]);
  const [applicationProcessValue, setApplicationProcessValue] = useState<
    Array<ApplicationProcessItem>
  >([]);
  const [criteriaValue, setCriteriaValue] = useState<Array<Criterion>>([]);
  const [fundingCurrency, setFundingCurrency] = useState('USD');
  const [fundingMin, setFundingMin] = useState<string | number>('');
  const [fundingMax, setFundingMax] = useState<string | number>('');
  const [matchValue, setMatchValue] = useState<string | number>('');
  const [matchEvidence, setMatchEvidence] = useState('');

  useEffect(() => {
    if (!open || !activeField) return;

    setValue(initialValue);

    switch (activeField.variant ?? 'string') {
      case 'date': {
        setDateValue(initialValue ? new Date(initialValue) : undefined);
        break;
      }
      case 'tags': {
        const raw = (cfp.extractedData as unknown as Record<string, unknown>)[
          activeField.field
        ];
        setTagsValue(Array.isArray(raw) ? (raw as Array<string>) : []);
        break;
      }
      case 'list': {
        const raw = (cfp.extractedData as unknown as Record<string, unknown>)[
          activeField.field
        ];
        setListValue(Array.isArray(raw) ? (raw as Array<string>) : []);
        break;
      }
      case 'fundingRange': {
        const ex = cfp.extractedData as unknown as Record<string, unknown>;

        setFundingCurrency(
          typeof ex.funding_currency === 'string' ? ex.funding_currency : 'USD',
        );
        setFundingMin(
          typeof ex.funding_min === 'number' ||
            typeof ex.funding_min === 'string'
            ? ex.funding_min
            : '',
        );
        setFundingMax(
          typeof ex.funding_max === 'number' ||
            typeof ex.funding_max === 'string'
            ? ex.funding_max
            : '',
        );
        break;
      }
      case 'applicationProcess': {
        const raw = (cfp.extractedData as unknown as Record<string, unknown>)[
          activeField.field
        ];

        if (!Array.isArray(raw)) {
          setApplicationProcessValue([]);
          break;
        }

        const normalized = raw
          .filter(Boolean)
          .map((item) => {
            const date =
              item && typeof item.date === 'string'
                ? item.date
                : item && item.date == null
                  ? null
                  : null;
            const description =
              item && typeof item.description === 'string'
                ? item.description
                : '';
            return { date, description } satisfies ApplicationProcessItem;
          })
          .filter((x) => x.description.trim().length > 0);

        setApplicationProcessValue(normalized);
        break;
      }
      case 'additionalInfoCriteria': {
        const criteria = Array.isArray(cfp.criteria) ? cfp.criteria : [];

        const normalized = criteria
          .filter((c) => c.type.hard !== true)
          .map((c) => ({
            id: c.id,
            status: c.status,
            evidence: c.evidence,
            type: c.type,
          }));

        setCriteriaValue(normalized);
        break;
      }
      case 'criteriaByFieldName': {
        const criteria = Array.isArray(cfp.criteria) ? cfp.criteria : [];
        const fieldNames = activeField.criterionFieldName;

        const allowed = Array.isArray(fieldNames)
          ? fieldNames
          : typeof fieldNames === 'string'
            ? [fieldNames]
            : [];

        const normalized = allowed.length
          ? criteria
            .filter((c) => allowed.includes(c.type.fieldName))
            .map((c) => ({
              id: c.id,
              status: c.status,
              evidence: c.evidence,
              type: c.type,
            }))
          : [];

        setCriteriaValue(normalized);
        break;
      }
      case 'match': {
        const match = cfp.extractedData.match;
        setMatchValue(
          match?.value != null ? Math.round(match.value * 100) : '',
        );
        setMatchEvidence(match?.evidence ?? '');
        break;
      }
      default:
        break;
    }
  }, [open, activeField, initialValue, cfp]);

  const updateMutation = useMutation({
    mutationFn: (nextCfp: CfpAnalysis) =>
      updateCfpAnalysisApi(nextCfp.id, nextCfp),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: cfpAnalysesKeys.all }),
        queryClient.invalidateQueries({
          queryKey: cfpAnalysesKeys.detail(cfp.id.toString()),
        }),
      ]);
      toast.success(t('toasts.updateSuccess'));
      onOpenChange(false);
    },
    onError: () => {
      toast.error(t('toasts.updateError'));
    },
  });

  const handleSave = async () => {
    if (!activeField) return;

    const saveCriteria = async () => {
      const nextCriteria = (Array.isArray(cfp.criteria) ? cfp.criteria : []).map(
        (c) => {
          const patch = criteriaValue.find((x) => x.id === c.id);
          if (!patch) return c;
          return {
            ...c,
            status: patch.status,
            evidence: patch.evidence,
          };
        },
      );

      await updateMutation.mutateAsync({
        ...cfp,
        criteria: nextCriteria,
      });
    };

    switch (activeField.variant ?? 'string') {
      case 'date': {
        const formattedDeadline = dateValue
          ? format(dateValue, 'yyyy-MM-dd')
          : undefined;
        await updateMutation.mutateAsync({
          ...cfp,
          ...(formattedDeadline ? { deadline: formattedDeadline } : {}),
        });
        return;
      }

      case 'tags': {
        await updateMutation.mutateAsync({
          ...cfp,
          extractedData: {
            ...cfp.extractedData,
            [activeField.field]: tagsValue,
          },
        });
        return;
      }

      case 'list': {
        await updateMutation.mutateAsync({
          ...cfp,
          extractedData: {
            ...cfp.extractedData,
            [activeField.field]: listValue,
          },
        });
        return;
      }

      case 'applicationProcess': {
        await updateMutation.mutateAsync({
          ...cfp,
          extractedData: {
            ...cfp.extractedData,
            [activeField.field]: applicationProcessValue,
          },
        });
        return;
      }

      case 'additionalInfoCriteria': {
        await saveCriteria();
        return;
      }

      case 'criteriaByFieldName': {
        await saveCriteria();
        return;
      }

      case 'fundingRange': {
        await updateMutation.mutateAsync({
          ...cfp,
          extractedData: {
            ...cfp.extractedData,
            funding_currency: fundingCurrency,
            funding_min: fundingMin ? Number(fundingMin) : null,
            funding_max: fundingMax ? Number(fundingMax) : null,
          },
        });
        return;
      }
      case 'match': {
        const decimalValue =
          matchValue !== '' ? Number(matchValue) / 100 : null;
        await updateMutation.mutateAsync({
          ...cfp,
          extractedData: {
            ...cfp.extractedData,
            match: {
              value: decimalValue,
              evidence: matchEvidence,
            },
          },
          match: decimalValue ?? undefined,
        });
        return;
      }

      case 'string':
      default: {
        const trimmed = value.trim();

        if (activeField.scope === 'root') {
          await updateMutation.mutateAsync({
            ...cfp,
            [activeField.field]: trimmed,
          });
          return;
        }

        await updateMutation.mutateAsync({
          ...cfp,
          extractedData: {
            ...cfp.extractedData,
            [activeField.field]: trimmed,
          },
        });
      }
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen && !activeField) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {activeField?.title ?? t('overview.edit.title')}
          </DialogTitle>
          <DialogDescription>
            {activeField?.description ?? t('overview.edit.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto max-h-[70vh] p-1">
          {(activeField?.variant ?? 'string') === 'string' && (
            <Textarea
              rows={4}
              className="resize-none"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={
                activeField?.placeholder ?? t('overview.edit.placeholder')
              }
              disabled={!activeField || updateMutation.isPending}
            />
          )}

          {activeField?.variant === 'date' && (
            <div className="space-y-2">
              <Label>{activeField.title ?? t('overview.edit.title')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    disabled={updateMutation.isPending}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateValue ? (
                      format(dateValue, 'PPP')
                    ) : (
                      <span>{t('filters.selectDeadline')}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateValue}
                    onSelect={(date) => setDateValue(date)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {activeField?.variant === 'tags' && (
            <TagsInputField
              value={tagsValue}
              onChange={(tags) => setTagsValue(tags)}
              variant="minimal"
            />
          )}

          {activeField?.variant === 'list' && (
            <ListInputField
              value={listValue}
              onChange={setListValue}
              label={activeField.title ?? t('overview.edit.title')}
              placeholder={activeField.placeholder ?? 'Add an item…'}
              disabled={updateMutation.isPending}
            />
          )}

          {activeField?.variant === 'applicationProcess' && (
            <ApplicationProcessInputField
              value={applicationProcessValue}
              onChange={setApplicationProcessValue}
              label={activeField.title ?? t('overview.edit.title')}
              disabled={updateMutation.isPending}
              emptyText={t('overview.applicationProcess.empty')}
            />
          )}

          {activeField?.variant === 'additionalInfoCriteria' && (
            <CriteriaInputField
              value={criteriaValue}
              onChange={setCriteriaValue}
              label={activeField.title ?? t('overview.edit.title')}
              disabled={updateMutation.isPending}
              emptyText={t('overview.additionalInfo.empty')}
            />
          )}

          {activeField?.variant === 'criteriaByFieldName' && (
            <CriteriaInputField
              value={criteriaValue}
              items={criteriaValue}
              onChange={setCriteriaValue}
              label={activeField.title ?? t('overview.edit.title')}
              disabled={updateMutation.isPending}
              emptyText={t('overview.additionalInfo.empty')}
            />
          )}

          {activeField?.variant === 'fundingRange' && (
            <div className="space-y-2">
              <Label>{activeField.title ?? t('overview.edit.title')}</Label>
              <div className="flex gap-2">
                <div className="w-24 shrink-0">
                  <Input
                    placeholder="USD"
                    value={fundingCurrency}
                    onChange={(e) => setFundingCurrency(e.target.value)}
                    className="uppercase"
                    maxLength={3}
                    disabled={updateMutation.isPending}
                  />
                </div>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-muted-foreground text-xs font-medium">
                    Min
                  </span>
                  <Input
                    type="number"
                    className="pl-9"
                    value={fundingMin}
                    onChange={(e) => setFundingMin(e.target.value)}
                    disabled={updateMutation.isPending}
                  />
                </div>
                <div className="flex items-center text-muted-foreground">-</div>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2.5 text-muted-foreground text-xs font-medium">
                    Max
                  </span>
                  <Input
                    type="number"
                    className="pl-10"
                    value={fundingMax}
                    onChange={(e) => setFundingMax(e.target.value)}
                    disabled={updateMutation.isPending}
                  />
                </div>
              </div>
            </div>
          )}

          {activeField?.variant === 'match' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('columns.match')} (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={matchValue}
                  onChange={(e) => setMatchValue(e.target.value)}
                  disabled={updateMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('columns.evidence')}</Label>
                <Textarea
                  rows={4}
                  className="resize-none"
                  value={matchEvidence}
                  onChange={(e) => setMatchEvidence(e.target.value)}
                  placeholder={t('overview.edit.placeholder')}
                  disabled={updateMutation.isPending}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending}
          >
            {t('actions.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!activeField || updateMutation.isPending}
          >
            {updateMutation.isPending ? t('actions.saving') : t('actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
