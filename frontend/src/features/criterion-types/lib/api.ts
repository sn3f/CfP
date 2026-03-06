import type { CriterionTypesParams } from './types';

import type { CriterionType, PaginatedResponse } from '@/lib/types';
import client from '@/integrations/axios';

export async function getCriterionTypesApi(params?: CriterionTypesParams) {
  const { data } = await client.get<PaginatedResponse<CriterionType>>(
    '/criterion-types',
    { params },
  );
  return data;
}

export async function getCriterionTypeDetailApi(id: number) {
  const { data } = await client.get<CriterionType>(`/criterion-types/${id}`);
  return data;
}

export async function createCriterionTypeApi(body: Omit<CriterionType, 'id'>) {
  const { data } = await client.post<CriterionType>('/criterion-types', body);
  return data;
}

export async function updateCriterionTypeApi(
  id: number,
  body: Partial<CriterionType>,
) {
  const { data } = await client.put<CriterionType>(`/criterion-types/${id}`, {
    id,
    ...body,
  });
  return data;
}

export async function deleteCriterionTypeApi(id: number) {
  await client.delete(`/criterion-types/${id}`);
}
