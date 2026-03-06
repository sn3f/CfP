import type { User } from 'oidc-client-ts';

export type SortInfo = {
  empty: boolean;
  sorted: boolean;
  unsorted: boolean;
};

export type PageableInfo = {
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  content: Array<T>;
  page: PageableInfo;
};

export type CriterionType = {
  id: number;
  fieldName: string;
  evaluationLogic: string | null;
  examples: string | null;
  hard: boolean | null;
};

export type Criterion = {
  id: number;
  status: string | boolean;
  evidence: string;
  type: CriterionType;
};

export type CfpAnalysis = {
  id: number;
  url: string;
  title: string;
  timestamp: string;
  deadline: string;
  eligible: boolean;
  exclusionReason?: string | null;
  classificationSummary?: string | null;
  confidenceScore: number;
  extractedData: Record<string, any>;
  criteria?: Array<Criterion>;
  content?: string;
  match?: number;
  analysisJob?: {
    createdAt?: string;
    id: string;
    scrapResult?: {
      content?: string;
      promptContext?: string;
    }
  }
};

export type FeedbackSummary = {
  id: number;
  cfpAnalysis: CfpAnalysis;
  createdBy: User;
  createdAt: string;
  updatedBy?: User | null;
  updatedAt?: string | null;
  items: Array<FeedbackSummaryItem>;
};

export type FeedbackSummaryItem = {
  id: number;
  type: FeedbackSummaryItemType;
  name: string;
  value: string;
  evidence: string;
  correct: boolean | null;
  comment: string | null;
};

export enum FeedbackSummaryItemType {
  EXTRACTED_DATA = 'EXTRACTED_DATA',
  CRITERION = 'CRITERION',
  CORE = 'CORE',
}
