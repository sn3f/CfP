export type SourcesParams = {
  page?: number;
  size?: number;
  sort?: string | Array<string>;
  search?: string;
};

export type Source = {
  id: number;
  name: string;
  websiteUrl: string;
  status: SourceStatus;
  frequency: string;
  guidelines?: string;
  classification: ProcessingMode;
  config?: Record<string, unknown>;
};

export type SourceStatus = 'ACTIVE' | 'INACTIVE';
export type SourceFrequency = 'WEEKLY' | 'MONTHLY';
export type ProcessingMode = 'MANUAL' | 'AUTO';

/**
 * Scraping Configuration Types
 */

export type OperationType = 'VISIT' | 'SCRAP' | 'ITERATOR' | 'CRAWLER';

export type ConfigurationStepItem = {
  'content-selector'?: string;
  'item-selector'?: string;
  'next-page-selector'?: string;
  'throttle-ms'?: string;
  'max-depth'?: string;
  'page-text-query'?: string;
  'page-score-threshold'?: string;
  'url-text-query'?: string;
  'url-score-threshold'?: string;
  'scrap-attachments'?: 'true' | 'false';
  'follow-links'?: 'true' | 'false';
  [key: string]: string | undefined;
};

export type ConfigurationStep = {
  name: string;
  operation: OperationType;
  configuration: ConfigurationStepItem;
};

export type ScrapingConfig = {
  steps: Array<ConfigurationStep>;
};
