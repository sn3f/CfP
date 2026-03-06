import { getCfpAnalysesApi, getCfpDetailApi } from './api';
import type { CfpAnalysesParams } from './types';

import { DEFAULT_STALE_TIME } from '@/lib/constants';
import { cfpAnalysesKeys } from '@/lib/key-factory';

export function getCfpAnalysesQueryOptions(params?: CfpAnalysesParams) {
  return {
    queryKey: cfpAnalysesKeys.list(params),
    queryFn: () => getCfpAnalysesApi(params),
    keepPreviousData: true,
    staleTime: DEFAULT_STALE_TIME,
    retry: false,
  };
}

export function getCfpDetailQueryOptions(id: string) {
  return {
    queryKey: cfpAnalysesKeys.detail(id),
    queryFn: () => getCfpDetailApi(id),
    staleTime: DEFAULT_STALE_TIME,
  };
}
