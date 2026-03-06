import { getCriterionTypeDetailApi, getCriterionTypesApi } from './api';
import type { CriterionTypesParams } from './types';

import { DEFAULT_STALE_TIME } from '@/lib/constants';
import { criterionTypesKeys } from '@/lib/key-factory';

export function getCriterionTypesQueryOptions(params?: CriterionTypesParams) {
  return {
    queryKey: criterionTypesKeys.list(params),
    queryFn: () => getCriterionTypesApi(params),
    keepPreviousData: true,
    staleTime: DEFAULT_STALE_TIME,
    retry: false,
  };
}

export function getCriterionTypeDetailQueryOptions(id: number) {
  return {
    queryKey: criterionTypesKeys.detail(id),
    queryFn: () => getCriterionTypeDetailApi(id),
    staleTime: DEFAULT_STALE_TIME,
  };
}
