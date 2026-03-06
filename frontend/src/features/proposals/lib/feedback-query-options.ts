import { createUserFeedbackApi } from './feedback-api';
import { cfpFeedbackKeys } from '@/lib/key-factory';

import { DEFAULT_STALE_TIME } from '@/lib/constants';

export function getOrCreateUserFeedbackQueryOptions(cfpId: string) {
  return {
    queryKey: cfpFeedbackKeys.detail(cfpId),
    queryFn: () => createUserFeedbackApi(cfpId),
    staleTime: DEFAULT_STALE_TIME,
    retry: false,
  };
}
