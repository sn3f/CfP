import { getSourceDetailApi, getSourcesApi } from './api';
import type { SourcesParams } from './types';

import { DEFAULT_STALE_TIME } from '@/lib/constants';
import { sourcesKeys } from '@/lib/key-factory';

export function getSourcesQueryOptions(params?: SourcesParams) {
  return {
    queryKey: sourcesKeys.list(params),
    queryFn: () => getSourcesApi(params),
    keepPreviousData: true,
    staleTime: DEFAULT_STALE_TIME,
    retry: false,
  };
}

export function getSourceDetailQueryOptions(id: number) {
  return {
    queryKey: sourcesKeys.detail(id),
    queryFn: () => getSourceDetailApi(id),
    staleTime: DEFAULT_STALE_TIME,
  };
}
