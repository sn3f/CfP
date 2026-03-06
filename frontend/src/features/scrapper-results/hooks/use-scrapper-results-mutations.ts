import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import {
  classifyScrapperResultApi,
  deleteScrapperResultApi,
  rejectScrapperResultApi,
} from '@/features/scrapper-results/lib/api';
import { scrapperResultsKeys } from '@/lib/key-factory';

/**
 * @name useScrapperResultMutations
 * @description
 * Provides classify, reject, and delete mutations for scrapper results.
 * Includes optional bulk helpers.
 */
export function useScrapperResultMutations() {
  const { t } = useTranslation('translation', { keyPrefix: 'scrapperResults' });
  const queryClient = useQueryClient();

  const invalidateAll = () =>
    queryClient.invalidateQueries({ queryKey: scrapperResultsKeys.all });

  const classifyMutation = useMutation({
    mutationFn: (id: number) => classifyScrapperResultApi(id),
    onSuccess: () => {
      invalidateAll();
      toast.success(t('toasts.classifySuccess'));
    },
    onError: () => {
      toast.error(t('toasts.classifyError'));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => rejectScrapperResultApi(id),
    onSuccess: () => {
      invalidateAll();
      toast.success(t('toasts.rejectSuccess'));
    },
    onError: () => {
      toast.error(t('toasts.rejectError'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteScrapperResultApi(id),
    onSuccess: () => {
      invalidateAll();
      toast.success(t('toasts.deleteSuccess'));
    },
    onError: () => {
      toast.error(t('toasts.deleteError'));
    },
  });

  const classifyMany = async (ids: Array<number>) => {
    if (!ids.length) return;
    await Promise.all(ids.map((id) => classifyMutation.mutateAsync(id)));
  };

  const rejectMany = async (ids: Array<number>) => {
    if (!ids.length) return;
    await Promise.all(ids.map((id) => rejectMutation.mutateAsync(id)));
  };

  const deleteMany = async (ids: Array<number>) => {
    if (!ids.length) return;
    await Promise.all(ids.map((id) => deleteMutation.mutateAsync(id)));
  };

  return {
    classifyMutation,
    rejectMutation,
    deleteMutation,
    classifyMany,
    rejectMany,
    deleteMany,
  };
}
