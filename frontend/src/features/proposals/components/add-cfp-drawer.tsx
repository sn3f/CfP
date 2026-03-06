import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { CfpClassifyPayload } from '@/features/proposals/lib/types';
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
import { Field, FieldGroup, FieldLabel, FieldSet } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import FileUploader from '@/features/proposals/components/file-uploader';
import { classifyApi } from '@/features/proposals/lib/api';
import { useIsMobile } from '@/hooks/use-mobile';
import { cfpAnalysesKeys } from '@/lib/key-factory';

interface AddCfpDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddCfpDrawer({
  open,
  onOpenChange,
  onSuccess,
}: AddCfpDrawerProps) {
  const { t } = useTranslation('translation', { keyPrefix: 'workspace.cfp' });
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    url: '',
    content: '',
    files: [] as Array<File>,
  });

  const addMutation = useMutation({
    mutationFn: (body: CfpClassifyPayload) => classifyApi(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cfpAnalysesKeys.all });
      toast.success(t('toasts.addSuccess'));
      setFormData({ url: '', content: '', files: [] }); // Reset form
      onOpenChange(false);
      onSuccess?.();
    },
    onError: () => {
      toast.error(t('toasts.addError'));
    },
  });

  const handleSave = async () => {
    await addMutation.mutateAsync({
      url: formData.url ? formData.url : undefined,
      content: formData.content || '',
      attachments: formData.files.length > 0 ? formData.files : undefined,
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
          <DrawerTitle>{t('addCfp.title')}</DrawerTitle>
          <DrawerDescription>{t('addCfp.description')}</DrawerDescription>
        </DrawerHeader>

        <div className="p-4 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-12rem)] space-y-4">
          <FieldGroup className="min-w-0">
            <FieldSet className="min-w-0">
              <Field className="min-w-0">
                <FieldLabel htmlFor="url">{t('addCfp.url')}</FieldLabel>
                <Input
                  id="url"
                  type="url"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData({ ...formData, url: e.target.value })
                  }
                />
              </Field>

              <Field className="min-w-0">
                <FieldLabel htmlFor="content">{t('addCfp.content')}</FieldLabel>
                <Textarea
                  id="content"
                  rows={6}
                  className="resize-none h-48 text-xs break-words break-all whitespace-pre-wrap"
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                />
              </Field>

              <Field className="min-w-0">
                <FieldLabel>{t('addCfp.attachments')}</FieldLabel>
                <div className="min-w-0">
                  <FileUploader
                    onChange={(files) =>
                      setFormData((prev) => ({ ...prev, files: files }))
                    }
                  />
                </div>
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
            disabled={
              (formData.files.length < 1 && !formData.content.trim()) ||
              addMutation.isPending
            }
          >
            {addMutation.isPending ? t('actions.saving') : t('actions.save')}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
