import type { CriterionTypesParams } from '@/features/criterion-types/lib/types';
import type { AdminFeedbackSummariesParams } from '@/features/feedback-summaries/lib/types';
import type { CfpAnalysesParams } from '@/features/proposals/lib/types';
import type { ScrapperResultsParams } from '@/features/scrapper-results/lib/types';
import type { SourcesParams } from '@/features/sources/lib/types';

export const cfpFeedbackKeys = {
  all: ['cfp-feedback'] as const,
  detail: (cfpId: string) => [...cfpFeedbackKeys.all, 'detail', cfpId] as const,
};

export const scrapperResultsKeys = {
  all: ['scrapper-results'] as const,
  list: (params?: ScrapperResultsParams) =>
    [...scrapperResultsKeys.all, 'list', params] as const,
  detail: (id: string) => [...scrapperResultsKeys.all, 'detail', id] as const,
};

export const criterionTypesKeys = {
  all: ['criterion-types'] as const,
  list: (params?: CriterionTypesParams) =>
    [...criterionTypesKeys.all, 'list', params] as const,
  detail: (id: number) => [...criterionTypesKeys.all, 'detail', id] as const,
};

export const cfpAnalysesKeys = {
  all: ['cfp-analysis'] as const,
  list: (params?: CfpAnalysesParams) =>
    [...cfpAnalysesKeys.all, 'list', params] as const,
  detail: (id: string) => [...cfpAnalysesKeys.all, 'detail', id] as const,
};

export const sourcesKeys = {
  all: ['sources'] as const,
  list: (params?: SourcesParams) =>
    [...sourcesKeys.all, 'list', params] as const,
  detail: (id: number) => [...sourcesKeys.all, 'detail', id] as const,
};

export const feedbackSummariesKeys = {
  all: ['feedback-summaries'] as const,
  list: (params?: AdminFeedbackSummariesParams) =>
    [...feedbackSummariesKeys.all, 'list', params] as const,
};
