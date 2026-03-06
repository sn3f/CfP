'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { KeyboardEvent, ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface TagsInputFieldProps {
  value?: Array<string>;
  onChange?: (tags: Array<string>) => void;
  label?: string;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  maxLength?: number;
  autoFocus?: boolean;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  allowDuplicates?: boolean;
  variant?: 'default' | 'enterprise' | 'minimal';
  tagVariant?: 'default' | 'secondary' | 'outline' | 'destructive';
}

const TagsInputFieldBase = ({
  value = [],
  onChange,
  label,
  placeholder,
  description,
  disabled = false,
  className,
  maxLength = 100,
  autoFocus = false,
  startIcon,
  endIcon,
  allowDuplicates = false,
  variant = 'enterprise',
  tagVariant = 'default',
}: TagsInputFieldProps) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation('translation', { keyPrefix: 'workspace.cfp' });

  useEffect(() => {
    const handleClickOutside = () => {};

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTagsChange = (newTags: Array<string>) => {
    if (onChange) {
      onChange(newTags);
    }
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;

    if (!allowDuplicates && value.includes(trimmedTag)) return;
    if (trimmedTag.length > maxLength) return;

    handleTagsChange([...value, trimmedTag]);
    setInputValue('');
  };

  const removeTag = (index: number) => {
    const newTags = value.filter((_, i) => i !== index);
    handleTagsChange(newTags);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'enterprise':
        return {
          container:
            'dark:border-gray-600 border-2 border-muted hover:border-primary/30 transition-all duration-300 backdrop-blur-sm',
          input:
            'bg-transparent border-0 focus:ring-0 placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0',
        };
      case 'minimal':
        return {
          container:
            'bg-background border border-border hover:border-primary/50 transition-colors',
          input:
            'bg-transparent border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0',
        };
      default:
        return {
          container:
            'bg-background border border-input hover:border-primary/50 transition-colors',
          input:
            'bg-transparent border-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label className="flex items-center gap-2">{label}</Label>}

      <div ref={containerRef} className="relative">
        <div
          className={cn(
            'min-h-[2.5rem] p-2 rounded-md flex flex-wrap gap-2 items-center ',
            styles.container,
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          {startIcon && (
            <span className="text-muted-foreground">{startIcon}</span>
          )}

          <AnimatePresence>
            {value.map((tag: string, index: number) => (
              <motion.div
                key={`${tag}-${index}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <Badge
                  variant={tagVariant}
                  className={cn(
                    'flex items-center gap-1 pr-1 group transition-colors',
                    variant === 'enterprise' && 'bg-primary border-primary/20',
                  )}
                >
                  <span className="max-w-[150px] truncate" title={tag}>
                    {tag}
                  </span>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => removeTag(index)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </Badge>
              </motion.div>
            ))}
          </AnimatePresence>

          <div className="flex-1 min-w-[120px]">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder={
                value.length === 0
                  ? (placeholder ?? t('actions.tagsInputPlaceholder'))
                  : t('actions.addAnother')
              }
              className={styles.input}
              disabled={disabled}
              autoFocus={autoFocus}
              maxLength={maxLength}
            />
          </div>

          {endIcon && <span className="text-muted-foreground">{endIcon}</span>}

          {!disabled && (
            <button
              type="button"
              onClick={() => {
                if (inputValue.trim()) {
                  addTag(inputValue);
                }
                inputRef.current?.focus();
              }}
              className="p-1 hover:bg-muted rounded transition-colors"
              disabled={!inputValue.trim()}
            >
              <Plus className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-xs text-muted-foreground ml-auto">
          {maxLength && inputValue && (
            <span>
              {inputValue.length}/{maxLength}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const TagsInputField = memo(TagsInputFieldBase);
