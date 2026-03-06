import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CircleAlert } from 'lucide-react';
import type { CfpReclassifyPayload } from '@/features/proposals/lib/types';
import type { CfpAnalysis } from '@/lib/types';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel, FieldSet } from '@/components/ui/field';
import FileUploader from '@/features/proposals/components/file-uploader';
import { reclassifyApi } from '@/features/proposals/lib/api';
import { useIsMobile } from '@/hooks/use-mobile';
import { cfpAnalysesKeys } from '@/lib/key-factory';

interface ReclassifyCfpDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cfpAnalysis: CfpAnalysis | null;
  onSuccess?: () => void;
}

export function ReclassifyCfpDrawer({
  open,
  onOpenChange,
  cfpAnalysis,
  onSuccess,
}: ReclassifyCfpDrawerProps) {
  const { t } = useTranslation('translation', { keyPrefix: 'workspace.cfp' });
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    addAttachments: [] as Array<File>,
  });

  const reclassifyMutation = useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & CfpReclassifyPayload) =>
      reclassifyApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cfpAnalysesKeys.all });
      toast.success(t('toasts.reclassifySuccess'));
      setFormData({ addAttachments: [] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: () => {
      toast.error(t('toasts.reclassifyError'));
    },
  });

  const handleSave = async () => {
    if (!cfpAnalysis) return;

    await reclassifyMutation.mutateAsync({
      id: cfpAnalysis.id,
      addAttachments:
        formData.addAttachments.length > 0
          ? formData.addAttachments
          : undefined,
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
          <DrawerTitle>{t('reclassifyCfp.title')}</DrawerTitle>
          <DrawerDescription>
            {t('reclassifyCfp.description')}
          </DrawerDescription>
          <div className="bg-amber-500/5 border-amber-500/25 border rounded-md px-4 py-3 text-foreground">
            <div className="flex gap-2 md:items-center">
              <div className="flex grow gap-3 md:items-center">
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500/20 max-md:mt-0.5"
                  aria-hidden="true"
                >
                  <CircleAlert
                    className="text-amber-500"
                    size={16}
                    strokeWidth={3}
                  />
                </div>

                <div className="flex grow flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div className="space-y-0.5">
                    <p className="text-sm font-normal text-amber-600">
                      {t('reclassifyCfp.caution.title')}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t('reclassifyCfp.caution.description')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DrawerHeader>

        <div className="p-4 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-12rem)] space-y-4">
          <FieldGroup className="min-w-0">
            <FieldSet className="min-w-0">
              <Field className="min-w-0">
                <FieldLabel>{t('reclassifyCfp.attachments')}</FieldLabel>
                <div className="min-w-0">
                  <FileUploader
                    onChange={(files) =>
                      setFormData((prev) => ({
                        ...prev,
                        addAttachments: files,
                      }))
                    }
                  />
                </div>
              </Field>
            </FieldSet>
          </FieldGroup>
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
              {t('actions.cancel')}
            </Button>
          </DrawerClose>
          <Button
            onClick={handleSave}
            disabled={
              reclassifyMutation.isPending
            }
          >
            {reclassifyMutation.isPending
              ? t('actions.saving')
              : t('actions.save')}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
