import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Criterion } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

type CriteriaInputFieldProps = {
  value: Array<Criterion>;
  /** Optionally restrict what is shown to a subset of `value` (e.g. single criterion edit). */
  items?: Array<Criterion>;
  onChange: (next: Array<Criterion>) => void;
  label: string;
  disabled?: boolean;
  emptyText?: string;
};

type CriterionItemProps = {
  item: Criterion;
  value: Array<Criterion>;
  onChange: (next: Array<Criterion>) => void;
  disabled?: boolean;
};

function CriterionItem({
  item,
  value,
  onChange,
  disabled,
}: CriterionItemProps) {
  const { t } = useTranslation('translation', { keyPrefix: 'workspace.cfp' });

  const checked = item.status === true || item.status === 'true';
  const isHard = !!item.type.hard;
  const labelId = `criterion-${item.id}-label`;
  const evidenceId = `criterion-${item.id}-evidence`;

  return (
    <li
      key={item.id}
      className={cn(
        'rounded-md bg-muted border p-3 space-y-2',
        !isHard && 'opacity-90',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex flex-row gap-2">
          <div
            id={labelId}
            className="font-medium text-sm text-foreground break-words"
          >
            {item.type.fieldName || `Criterion #${item.id}`}
          </div>
          {isHard && <Badge variant="secondary">{t('hardCriterion')}</Badge>}
        </div>

        <label
          className={cn(
            'flex items-center gap-2 text-sm',
            disabled && 'opacity-60',
          )}
        >
          <Checkbox
            checked={checked}
            disabled={disabled}
            aria-labelledby={labelId}
            onCheckedChange={(nextChecked) => {
              const next = value.map((c) =>
                c.id === item.id
                  ? {
                      ...c,
                      status: nextChecked === true,
                    }
                  : c,
              );
              onChange(next);
            }}
          />
          <span className="text-muted-foreground">{t('met')}</span>
        </label>
      </div>

      <div className="space-y-1">
        <Label htmlFor={evidenceId} className="text-xs text-muted-foreground">
          {t('columns.evidence')}
        </Label>
        <Textarea
          id={evidenceId}
          value={item.evidence}
          disabled={disabled}
          rows={3}
          onChange={(e) => {
            const next = value.map((c) =>
              c.id === item.id
                ? {
                    ...c,
                    evidence: e.target.value,
                  }
                : c,
            );
            onChange(next);
          }}
          className="resize-none bg-background"
        />
      </div>
    </li>
  );
}

export function CriteriaInputField({
  value,
  items,
  onChange,
  label,
  disabled,
  emptyText = '',
}: CriteriaInputFieldProps) {
  const renderedItems = useMemo(() => {
    if (!items) return value;
    const allowedIds = new Set(items.map((x) => x.id));
    return value.filter((x) => allowedIds.has(x.id));
  }, [items, value]);

  return (
    <div className="space-y-3">
      <Label>{label}</Label>

      {renderedItems.length === 0 ? (
        <p className="text-sm text-muted-foreground italic text-center py-4">
          {emptyText}
        </p>
      ) : (
        <ul className="space-y-2">
          {renderedItems.map((item) => (
            <CriterionItem
              key={item.id}
              item={item}
              value={value}
              onChange={onChange}
              disabled={disabled}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
