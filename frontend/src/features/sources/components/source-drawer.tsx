import * as React from 'react';
import { useTranslation } from 'react-i18next';

import type {
  ProcessingMode,
  Source,
  SourceFrequency,
  SourceStatus,
} from '@/features/sources/lib/types';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
  FieldSet,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ConfigurationField } from '@/features/sources/components/configuration-field';
import { JsonCreatorModal } from '@/features/sources/components/json-creator-modal';
import {
  PROCESSING_MODE_OPTIONS,
  SOURCE_FREQUENCY_OPTIONS,
  SOURCE_STATUS_OPTIONS,
} from '@/features/sources/lib/constants';
import { useIsMobile } from '@/hooks/use-mobile';

type SourceDrawerProps = {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  formData: {
    name: string;
    websiteUrl: string;
    status: SourceStatus;
    frequency: SourceFrequency;
    guidelines: string;
    config: string;
    classification: ProcessingMode;
  };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      name: string;
      websiteUrl: string;
      status: SourceStatus;
      frequency: SourceFrequency;
      guidelines: string;
      config: string;
      classification: ProcessingMode;
    }>
  >;
  isJsonValid: boolean;
  setIsJsonValid: (val: boolean) => void;
  editingItem: Source | null;
  handleSave: () => void;
  handleScrapping: (id: number) => void;
};

export function SourceDrawer({
  open,
  onOpenChange,
  formData,
  setFormData,
  isJsonValid,
  setIsJsonValid,
  editingItem,
  handleSave,
  handleScrapping,
}: SourceDrawerProps) {
  const { t } = useTranslation('translation', { keyPrefix: 'sources' });
  const isMobile = useIsMobile();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction={isMobile ? 'bottom' : 'right'}
      dismissible={false}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            {editingItem ? t('actions.editSource') : t('actions.addNewSource')}
          </DrawerTitle>
          <DrawerDescription>
            {editingItem
              ? t('dialogs.form.editDescription')
              : t('dialogs.form.createDescription')}
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4 overflow-y-auto max-h-[calc(100vh-12rem)] space-y-4">
          <FieldGroup>
            <FieldSet>
              {/* Name */}
              <Field>
                <FieldLabel htmlFor="name">{t('dialogs.form.name')}</FieldLabel>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </Field>

              {/* Website URL */}
              <Field>
                <FieldLabel htmlFor="websiteUrl">
                  {t('dialogs.form.websiteUrl')}
                </FieldLabel>
                <Input
                  id="websiteUrl"
                  type="url"
                  value={formData.websiteUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, websiteUrl: e.target.value })
                  }
                />
              </Field>

              {/* Status & Frequency */}
              <div className="grid grid-cols-2 gap-2">
                <Field>
                  <FieldLabel htmlFor="status">
                    {t('dialogs.form.status')}
                  </FieldLabel>
                  <Select
                    value={formData.status}
                    onValueChange={(v: SourceStatus) =>
                      setFormData({ ...formData, status: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {t(`status.${opt.value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="frequency">
                    {t('dialogs.form.frequency')}
                  </FieldLabel>
                  <Select
                    value={formData.frequency}
                    onValueChange={(v: SourceFrequency) =>
                      setFormData({ ...formData, frequency: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_FREQUENCY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {t(`frequency.${opt.value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {/* Guidelines */}
              <Field>
                <FieldLabel htmlFor="guidelines">
                  {t('dialogs.form.guidelines')}
                </FieldLabel>
                <Textarea
                  id="guidelines"
                  rows={3}
                  className="resize-none h-16 text-xs break-words break-all whitespace-pre-wrap"
                  value={formData.guidelines}
                  onChange={(e) =>
                    setFormData({ ...formData, guidelines: e.target.value })
                  }
                />
                <FieldDescription>
                  {t('dialogs.form.placeholderGuidelines')}
                </FieldDescription>
              </Field>

              {/* Advanced Configuration */}
              <Field>
                <ConfigurationField
                  value={formData.config}
                  onEdit={() => setIsModalOpen(true)}
                />
              </Field>

              {/* Modal for JSON editing */}
              <JsonCreatorModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                value={formData.config}
                onChange={(newVal: string) => {
                  setFormData({ ...formData, config: newVal });
                  try {
                    JSON.parse(newVal);
                    setIsJsonValid(true);
                  } catch {
                    setIsJsonValid(false);
                  }
                }}
                onSave={(jsonVal: string) => {
                  setFormData({ ...formData, config: jsonVal });
                  setIsModalOpen(false);
                }}
              />

              {!isJsonValid && (
                <p className="text-xs text-destructive">
                  {t('dialogs.form.invalidJson')}
                </p>
              )}

              <FieldSeparator />

              {/* Classification */}
              <Field>
                <FieldLabel htmlFor="classification">
                  {t('dialogs.form.classification')}
                </FieldLabel>
                <Select
                  value={formData.classification}
                  onValueChange={(v: ProcessingMode) =>
                    setFormData({ ...formData, classification: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROCESSING_MODE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {t(`processing.${opt.value}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {/* Scraping Trigger */}
              {editingItem && (
                <>
                  <FieldSeparator />
                  <Field orientation="horizontal" className="gap-4">
                    <FieldContent>
                      <FieldLabel>
                        {t('dialogs.form.scrappingTrigger')}
                      </FieldLabel>
                      <FieldDescription>
                        {t('dialogs.form.scrappingTriggerDescription')}
                      </FieldDescription>
                    </FieldContent>
                    <Button
                      variant="default"
                      onClick={() => handleScrapping(editingItem.id)}
                      className="my-auto"
                    >
                      {t('actions.scrapping')}
                    </Button>
                  </Field>
                </>
              )}
            </FieldSet>
          </FieldGroup>
        </div>

        {/* Footer */}
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
            disabled={!formData.name.trim() || !formData.websiteUrl.trim()}
          >
            {editingItem ? t('actions.updateSource') : t('actions.saveAdd')}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
