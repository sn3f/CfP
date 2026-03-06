import { format, parseISO } from 'date-fns';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type ApplicationProcessItem = {
  date: string | null;
  description: string;
};

type ApplicationProcessItemWithId = ApplicationProcessItem & {
  _uiId: string;
};

function makeUiId() {
  // Crypto is available in modern browsers; fall back to Math.random.
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return `ap_${crypto.randomUUID()}`;
  }
  return `ap_${Math.random().toString(36).slice(2)}`;
}

type ApplicationProcessInputFieldProps = {
  value: Array<ApplicationProcessItem>;
  onChange: (next: Array<ApplicationProcessItem>) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  emptyText?: string;
};

function normalizeDescription(raw: string) {
  return raw.trim().replace(/\s+/g, ' ');
}

function normalizeDate(raw: string) {
  const v = raw.trim();
  return v.length ? v : null;
}

function toIsoDateString(date: Date) {
  return format(date, 'yyyy-MM-dd');
}

function fromIsoDateString(date: string | null) {
  if (!date) return undefined;
  try {
    return parseISO(date);
  } catch {
    return undefined;
  }
}

export function ApplicationProcessInputField({
  value,
  onChange,
  label,
  disabled,
  className,
  emptyText,
}: ApplicationProcessInputFieldProps) {
  const { t } = useTranslation('translation', { keyPrefix: 'workspace.cfp' });

  const [uiIdByIndex, setUiIdByIndex] = useState<Array<string>>([]);

  useEffect(() => {
    setUiIdByIndex((prev) => {
      const next = prev.slice(0, value.length);
      while (next.length < value.length) next.push(makeUiId());
      return next;
    });
  }, [value.length]);

  // Keep a stable UI id per row so React doesn't remount Textarea on every keystroke.
  // (Using description/date in a key causes focus loss when those fields change.)
  const itemsWithId = useMemo<Array<ApplicationProcessItemWithId>>(() => {
    return value.map((item, idx) => ({
      ...item,
      _uiId: uiIdByIndex[idx] ?? `ap_${idx}`,
    }));
  }, [value, uiIdByIndex]);

  const [draftDate, setDraftDate] = useState('');
  const [draftDescription, setDraftDescription] = useState('');

  const canAdd = useMemo(() => {
    return normalizeDescription(draftDescription).length > 0;
  }, [draftDescription]);

  const add = () => {
    const nextDescription = normalizeDescription(draftDescription);
    if (!nextDescription) return;

    const next: ApplicationProcessItem = {
      date: normalizeDate(draftDate),
      description: nextDescription,
    };

    onChange([...value, next]);
    setUiIdByIndex((prev) => {
      const nextIds = [...prev];
      nextIds.push(makeUiId());
      return nextIds;
    });
    setDraftDate('');
    setDraftDescription('');
  };

  const update = (index: number, patch: Partial<ApplicationProcessItem>) => {
    const next = [...value];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
    setUiIdByIndex((prev) => prev.filter((_, i) => i !== index));
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);

    setUiIdByIndex((prev) => {
      const nextIds = [...prev];
      const [moved] = nextIds.splice(from, 1);
      nextIds.splice(to, 0, moved);
      return nextIds;
    });
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label>{label}</Label>}

      <div className="grid gap-2 grid-cols-1">
        <div className="flex gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={disabled}
                className={cn(
                  'w-full justify-start text-left font-normal max-w-52',
                  !draftDate && 'text-muted-foreground',
                )}
              >
                {draftDate
                  ? format(parseISO(draftDate), 'PPP')
                  : t('selectDate')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={draftDate ? parseISO(draftDate) : undefined}
                onSelect={(date) =>
                  setDraftDate(date ? toIsoDateString(date) : '')
                }
                disabled={disabled}
              />
            </PopoverContent>
          </Popover>
          <Button
            type="button"
            variant="secondary"
            onClick={add}
            disabled={disabled || !canAdd}
            aria-label={t('addItem')}
          >
            <Plus className="size-4" aria-hidden />
          </Button>
        </div>

        <Textarea
          value={draftDescription}
          onChange={(e) => setDraftDescription(e.target.value)}
          placeholder={t('overview.edit.placeholder')}
          disabled={disabled}
          className="resize-none"
        />
      </div>

      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText ?? ''}</p>
      ) : (
        <ul className="space-y-2">
          {itemsWithId.map((item, idx) => (
            <li
              key={item._uiId}
              className="space-y-2 rounded-md border bg-background p-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  {idx + 1}
                </span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={disabled}
                      className={cn(
                        'w-full justify-start text-left font-normal max-w-52',
                        !item.date && 'text-muted-foreground',
                      )}
                    >
                      {item.date
                        ? format(parseISO(item.date), 'PPP')
                        : t('selectDate')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fromIsoDateString(item.date)}
                      onSelect={(date) =>
                        update(idx, {
                          date: date ? toIsoDateString(date) : null,
                        })
                      }
                      disabled={disabled}
                    />
                  </PopoverContent>
                </Popover>
                <div className="ml-auto flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => move(idx, idx - 1)}
                    disabled={disabled || idx === 0}
                    aria-label={t('moveUp')}
                  >
                    <ChevronUp className="size-3" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => move(idx, idx + 1)}
                    disabled={disabled || idx === value.length - 1}
                    aria-label={t('moveDown')}
                  >
                    <ChevronDown className="size-3" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => remove(idx)}
                    disabled={disabled}
                    aria-label={t('removeItem')}
                  >
                    <Trash2 className="size-3" aria-hidden />
                  </Button>
                </div>
              </div>

              <Textarea
                value={item.description}
                onChange={(e) => update(idx, { description: e.target.value })}
                onBlur={() =>
                  update(idx, {
                    description: normalizeDescription(item.description),
                  })
                }
                disabled={disabled}
                className="resize-none"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
