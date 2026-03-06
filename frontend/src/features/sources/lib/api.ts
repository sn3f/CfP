import type { Source, SourcesParams } from './types';

import type { PaginatedResponse } from '@/lib/types';
import client from '@/integrations/axios';

export async function getSourcesApi(params?: SourcesParams) {
  const { data } = await client.get<PaginatedResponse<Source>>('/cfp-sources', {
    params,
  });
  return data;
}

export async function getSourceDetailApi(id: number) {
  const { data } = await client.get<Source>(`/cfp-sources/${id}`);
  return data;
}

export async function createSourceApi(body: Omit<Source, 'id'>) {
  const { data } = await client.post<Source>('/cfp-sources', body);
  return data;
}

export async function updateSourceApi(id: number, body: Partial<Source>) {
  const { data } = await client.put<Source>(`/cfp-sources/${id}`, {
    id,
    ...body,
  });
  return data;
}

export async function deleteSourceApi(id: number) {
  await client.delete(`/cfp-sources/${id}`);
}

export async function scrapeSourceApi(id: number) {
  await client.post<Source>(`/cfp-sources/${id}/scrape`);
}
