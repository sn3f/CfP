import type { ScrapperResult, ScrapperResultsParams } from './types';

import type { PaginatedResponse } from '@/lib/types';
import client from '@/integrations/axios';

export async function getScrapperResultsApi(params?: ScrapperResultsParams) {
  const { data } = await client.get<PaginatedResponse<ScrapperResult>>(
    '/scrap-results',
    { params },
  );
  return data;
}

export async function getScrapperResultsDetailApi(id: string) {
  const { data } = await client.get<ScrapperResult>(`/scrap-results/${id}`);
  return data;
}

export async function deleteScrapperResultApi(id: number) {
  await client.delete(`/scrap-results/${id}`);
}

export async function rejectScrapperResultApi(id: number) {
  await client.post<Omit<ScrapperResult, 'id'>>(`/scrap-results/${id}/reject`);
}

export async function classifyScrapperResultApi(id: number) {
  await client.post<Omit<ScrapperResult, 'id'>>(
    `/scrap-results/${id}/classify`,
  );
}
