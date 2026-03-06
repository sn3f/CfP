import { getFeedbackSummariesApi } from './api';
import type { AdminFeedbackSummariesParams } from './types';

import { DEFAULT_STALE_TIME } from '@/lib/constants';
import { feedbackSummariesKeys } from '@/lib/key-factory';

export function getFeedbackSummariesQueryOptions(
  params?: AdminFeedbackSummariesParams,
) {
  return {
    queryKey: feedbackSummariesKeys.list(params),
    queryFn: () => getFeedbackSummariesApi(params),
    keepPreviousData: true,
    staleTime: DEFAULT_STALE_TIME,
    retry: false,
  };
}
