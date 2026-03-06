import type { FeedbackSummary } from '@/lib/types';
import client from '@/integrations/axios';

export async function createUserFeedbackApi(cfpId: string) {
  const { data } = await client.post<FeedbackSummary>(
    `/cfp-analysis/${cfpId}/feedback`,
  );
  return data;
}

export async function updateUserFeedbackApi(
  cfpId: string,
  feedbackId: string,
  payload: FeedbackSummary,
) {
  const { data } = await client.put<FeedbackSummary>(
    `/cfp-analysis/${cfpId}/feedback/${feedbackId}`,
    payload,
  );
  return data;
}

export async function deleteUserFeedbackApi(cfpId: string, feedbackId: string) {
  await client.delete(`/cfp-analysis/${cfpId}/feedback/${feedbackId}`);
}
