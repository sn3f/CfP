import type { CfpAnalysis, FeedbackSummaryItem } from '@/lib/types';

export type AdminFeedbackSummariesParams = {
  page?: number;
  size?: number;
  sort?: string | Array<string>;
  search?: string;
};

export type AdminFeedbackSummary = {
  cfpAnalysis: CfpAnalysis;
  createdAt: string;
  id: number;
  updatedAt: string;
  items: Array<FeedbackSummaryItem>;
  owner: {
    email: string;
    lastSyncedAt: string;
    name: string;
    sub: string;
  };
};

export type AdminFeedbackOwner = AdminFeedbackSummary['owner'];
