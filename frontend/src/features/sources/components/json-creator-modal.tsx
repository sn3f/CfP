import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Code2Icon,
  CopyIcon,
  ExpandIcon,
  EyeIcon,
  GripVerticalIcon,
  PencilIcon,
  PlusIcon,
  ShrinkIcon,
  Trash2Icon,
} from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import type {
  ConfigurationStep,
  OperationType,
  ScrapingConfig,
} from '@/features/sources/lib/types';
import { Button } from '@/components/ui/button';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOperationFields } from '@/features/sources/hooks/use-operation-fields';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

type JsonCreatorModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: string;
  onChange: (value: string) => void;
  onSave?: (value: string) => void;
};

export function JsonCreatorModal({
  open,
  onOpenChange,
  value,
  onChange,
  onSave,
}: JsonCreatorModalProps) {
  const { t } = useTranslation('translation', { keyPrefix: 'sources' });

  const [steps, setSteps] = React.useState<Array<ConfigurationStep>>([]);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'builder' | 'preview'>(
    'builder',
  );
  const [copied, setCopied] = React.useState(false);
  const isMobile = useIsMobile();

  // Parse initial value when modal opens
  React.useEffect(() => {
    if (open) {
      try {
        const parsed: ScrapingConfig = JSON.parse(value || '{"steps":[]}');

        if (Array.isArray(parsed.steps)) {
          const visibleSteps = parsed.steps.filter(
            ({ operation }) => operation !== 'SCRAP',
          );
          setSteps(visibleSteps);
        } else {
          setSteps([]);
        }
      } catch {
        setSteps([]);
      }
    }
  }, [open, value]);

  const generateJson = React.useCallback(() => {
    const userSteps = steps.filter(({ operation }) => operation !== 'SCRAP');

    // Rename steps sequentially
    const normalizedSteps = userSteps.map((step, index) => ({
      ...step,
      name: `step-${index}`,
    }));

    // Build auto SCRAP step
    const scrapStep: ConfigurationStep = {
      name: `step-${normalizedSteps.length}`,
      operation: 'SCRAP',
      configuration: {},
    };

    // Final config object with SCRAP step appended
    const config: ScrapingConfig = {
      steps: [...normalizedSteps, scrapStep],
    };

    return JSON.stringify(config, null, 2);
  }, [steps]);

  const addStep = () => {
    const newStep: ConfigurationStep = {
      name: `step-${steps.length}`,
      operation: 'VISIT',
      configuration: {},
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    // Rename steps to maintain sequential naming
    const renamedSteps = newSteps.map((step, i) => ({
      ...step,
      name: `step-${i}`,
    }));
    setSteps(renamedSteps);
  };

  const updateStep = (index: number, updates: Partial<ConfigurationStep>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    setSteps(newSteps);
  };

  // eslint-disable-next-line no-shadow
  const updateStepConfig = (index: number, key: string, value: string) => {
    const newSteps = [...steps];
    if (value) {
      newSteps[index].configuration[key] = value;
    } else {
      delete newSteps[index].configuration[key];
    }
    setSteps(newSteps);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;

    const newSteps = [...steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[newIndex];
    newSteps[newIndex] = temp;

    const renamedSteps = newSteps.map((step, i) => ({
      ...step,
      name: `step-${i}`,
    }));
    setSteps(renamedSteps);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateJson());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    const json = generateJson();
    onChange(json);
    onSave?.(json);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'flex flex-col gap-0 p-0 transition-all duration-200',
          isExpanded || isMobile ? 'h-[95vh]' : 'h-[80vh]',
        )}
        showCloseButton={false}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <DialogTitle className="flex items-center gap-2">
                <Code2Icon className="size-4" />
                {t('dialogs.form.advancedConfig')}
              </DialogTitle>
              <DialogDescription>
                {t('dialogs.form.advancedConfigDescription')}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ShrinkIcon className="size-4" />
                ) : (
                  <ExpandIcon className="size-4" />
                )}
                <span className="sr-only">
                  {isExpanded
                    ? t('dialogs.form.shrink')
                    : t('dialogs.form.expand')}
                </span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'builder' | 'preview')}
          className="flex-1 flex flex-col overflow-hidden gap-0"
        >
          <div className="px-4 py-2 border-b bg-muted/30 shrink-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="builder" className="gap-2">
                <PencilIcon className="size-3" />
                {t('dialogs.form.builder')}
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <EyeIcon className="size-3" />
                {t('dialogs.form.preview')}
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Builder Tab */}
          <TabsContent
            value="builder"
            className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden"
          >
            <div className="h-full overflow-y-auto p-4 space-y-3">
              {steps.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg bg-muted/30">
                  <p className="text-muted-foreground mb-4">
                    {t('dialogs.form.noStepsConfigured')}
                  </p>
                  <Button
                    onClick={addStep}
                    variant="outline"
                    className="gap-2 bg-transparent"
                  >
                    <PlusIcon className="size-4" />
                    {t('dialogs.form.addFirstStep')}
                  </Button>
                </div>
              ) : (
                <>
                  {steps.map((step, index) => (
                    <StepCard
                      key={step.name}
                      step={step}
                      index={index}
                      totalSteps={steps.length}
                      onUpdate={(updates) => updateStep(index, updates)}
                      // eslint-disable-next-line no-shadow
                      onUpdateConfig={(key, value) =>
                        updateStepConfig(index, key, value)
                      }
                      onRemove={() => removeStep(index)}
                      onMoveUp={() => moveStep(index, 'up')}
                      onMoveDown={() => moveStep(index, 'down')}
                    />
                  ))}
                  <Button
                    onClick={addStep}
                    variant="outline"
                    className="w-full gap-2 border-dashed bg-transparent"
                  >
                    <PlusIcon className="size-4" />
                    {t('dialogs.form.addStep')}
                  </Button>
                </>
              )}
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent
            value="preview"
            className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden"
          >
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-auto p-4 bg-muted/30 relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="text-xs absolute top-2 right-2 flex items-center gap-1.5"
                >
                  {copied ? (
                    <CheckIcon className="size-3" />
                  ) : (
                    <CopyIcon className="size-3" />
                  )}
                  {copied
                    ? t('dialogs.form.copied')
                    : t('dialogs.form.copyJson')}
                </Button>
                {/* Live region for screen readers */}
                <div role="status" aria-live="polite" className="sr-only">
                  {copied ? t('dialogs.form.copied') : ''}
                </div>

                <pre className="text-sm font-mono whitespace-pre-wrap break-all">
                  {generateJson()}
                </pre>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="px-6 py-4 border-t shrink-0">
          <div className="flex items-center gap-2 mr-auto text-sm text-muted-foreground">
            {steps.length}{' '}
            {t('dialogs.form.stepsConfigured', { count: steps.length })}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleSave}>
            {t('dialogs.form.saveConfiguration')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepCard({
  step,
  index,
  totalSteps,
  onUpdate,
  onUpdateConfig,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  step: ConfigurationStep;
  index: number;
  totalSteps: number;
  onUpdate: (updates: Partial<ConfigurationStep>) => void;
  onUpdateConfig: (key: string, value: string) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { t } = useTranslation('translation', { keyPrefix: 'sources' });
  const allFields = useOperationFields();
  const fields =
    step.operation in allFields
      ? allFields[step.operation as Exclude<OperationType, 'SCRAP'>]
      : [];

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Step Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b">
        <GripVerticalIcon className="size-4 text-muted-foreground shrink-0" />
        <div className="flex-1 flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            {t('dialogs.form.step')} {index + 1}
          </span>
          <Select
            value={step.operation}
            onValueChange={(v: OperationType) =>
              onUpdate({ operation: v, configuration: {} })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['VISIT', 'ITERATOR', 'CRAWLER'] as Array<OperationType>).map(
                (type) => (
                  <SelectItem key={type} value={type}>
                    {t(`dialogs.form.operation.${type}`)}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMoveUp}
            disabled={index === 0}
          >
            <ChevronUpIcon className="size-4" />
            <span className="sr-only">{t('dialogs.form.moveUp')}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onMoveDown}
            disabled={index === totalSteps - 1}
          >
            <ChevronDownIcon className="size-4" />
            <span className="sr-only">{t('dialogs.form.moveDown')}</span>
          </Button>
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 hover:dark:bg-destructive/20"
            size="icon"
            onClick={onRemove}
          >
            <Trash2Icon className="size-4" />
            <span className="sr-only">{t('dialogs.form.removeStep')}</span>
          </Button>
        </div>
      </div>

      {/* Step Configuration */}
      <div className="p-4 space-y-3">
        {fields.length > 0 && (
          <div className="space-y-2">
            {fields.map((field) => {
              const isBooleanField = [
                'scrap-attachments',
                'follow-links',
              ].includes(field.key);

              return (
                <div key={field.key} className="space-y-1.5">
                  <Label
                    htmlFor={`${step.name}-${field.key}`}
                    className="text-xs font-medium"
                  >
                    {field.label}
                  </Label>

                  {isBooleanField ? (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs text-muted-foreground">
                        {t(
                          `dialogs.form.operationFields.${field.key}.placeholder`,
                        )}
                      </span>
                      <Switch
                        id={`${step.name}-${field.key}`}
                        checked={step.configuration[field.key] === 'true'}
                        onCheckedChange={(checked) =>
                          onUpdateConfig(field.key, checked ? 'true' : '')
                        }
                      />
                    </div>
                  ) : (
                    <Input
                      id={`${step.name}-${field.key}`}
                      value={step.configuration[field.key] || ''}
                      onChange={(e) =>
                        onUpdateConfig(field.key, e.target.value)
                      }
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
