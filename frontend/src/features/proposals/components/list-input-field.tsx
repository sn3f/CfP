import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type ListInputFieldProps = {
  value: Array<string>;
  onChange: (next: Array<string>) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  emptyText?: string;
};

function normalizeItem(raw: string) {
  return raw.trim().replace(/\s+/g, ' ');
}

export function ListInputField({
  value,
  onChange,
  label,
  placeholder = '',
  disabled,
  className,
  emptyText = '',
}: ListInputFieldProps) {
  const { t } = useTranslation('translation', { keyPrefix: 'workspace.cfp' });
  const [draft, setDraft] = useState('');

  const canAdd = useMemo(() => normalizeItem(draft).length > 0, [draft]);

  const add = () => {
    const next = normalizeItem(draft);
    if (!next) return;
    onChange([...value, next]);
    setDraft('');
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label>{label}</Label>}

      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (!disabled) add();
            }
          }}
        />
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

      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {value.map((item, idx) => (
            <li
              key={`${item}-${idx}`}
              className="flex items-center gap-2 rounded-md border bg-background px-2 py-1"
            >
              {idx + 1}
              <span className="flex-1 text-sm text-foreground break-words">
                {item}
              </span>
              <div className="flex items-center gap-1">
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
