import type {CfpAnalysesParams, CfpClassifyPayload, CfpReclassifyPayload} from './types';

import type { CfpAnalysis, PaginatedResponse } from '@/lib/types';
import client from '@/integrations/axios';

export async function getCfpAnalysesApi(params?: CfpAnalysesParams) {
  const { data } = await client.get<PaginatedResponse<CfpAnalysis>>(
    '/cfp-analysis',
    { params },
  );
  return data;
}

export async function getCfpDetailApi(id: string) {
  const { data } = await client.get<CfpAnalysis>(`/cfp-analysis/${id}`);
  return data;
}

export async function deleteCfpAnalysisApi(id: number) {
  await client.delete(`/cfp-analysis/${id}`);
}

export async function updateCfpAnalysisApi(id: number, payload: Partial<CfpAnalysis>): Promise<CfpAnalysis> {
  const { data } = await client.put<CfpAnalysis>(`/cfp-analysis/${id}`, {
    id,
    ...payload,
  });
  return data;
}

export async function classifyApi(payload: CfpClassifyPayload) {
  const formData = new FormData();

  if (payload.url) {
    formData.append('url', payload.url);
  }

  const contentToSend = payload.content ? payload.content : ' ';
  formData.append('content', contentToSend);

  if (payload.attachments && payload.attachments.length > 0) {
    payload.attachments.forEach((file) => {
      formData.append('attachments', file);
    });
  }

  await client.post('scrap-results/classify', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

export async function reclassifyApi(id: number, payload: CfpReclassifyPayload) {
  const formData = new FormData();

  if (payload.addAttachments && payload.addAttachments.length > 0) {
    payload.addAttachments.forEach((file) => {
      formData.append('addAttachments', file);
    });
  }

  await client.post(`cfp-analysis/${id}/reclassify`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}
