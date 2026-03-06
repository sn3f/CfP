import { getScrapperResultsApi, getScrapperResultsDetailApi } from './api';
import type { ScrapperResultsParams } from './types';

import { scrapperResultsKeys } from '@/lib/key-factory';
import { DEFAULT_STALE_TIME } from '@/lib/constants';

export function getScrapperResultsQueryOptions(params?: ScrapperResultsParams) {
  return {
    queryKey: scrapperResultsKeys.list(params),
    queryFn: () => getScrapperResultsApi(params),
    keepPreviousData: true,
    staleTime: DEFAULT_STALE_TIME,
    retry: false,
  };
}

export function getScrapperResultsDetailQueryOptions(id: string) {
  return {
    queryKey: scrapperResultsKeys.detail(id),
    queryFn: () => getScrapperResultsDetailApi(id),
    staleTime: DEFAULT_STALE_TIME,
    retry: false,
  };
}
