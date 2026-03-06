import type {
  AdminFeedbackSummariesParams,
  AdminFeedbackSummary,
} from './types';

import type { PaginatedResponse } from '@/lib/types';
import client from '@/integrations/axios';

export async function getFeedbackSummariesApi(
  params?: AdminFeedbackSummariesParams,
) {
  const { data } = await client.get<PaginatedResponse<AdminFeedbackSummary>>(
    '/cfp-analysis-feedback',
    { params },
  );
  return data;
}

export async function deleteFeedbackSummaryApi(id: number) {
  const { data } = await client.delete(`/cfp-analysis-feedback/${id}`);
  return data;
}
