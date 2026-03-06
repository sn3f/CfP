import type { ProcessingMode, SourceFrequency, SourceStatus } from './types';

export const SOURCE_FREQUENCY_OPTIONS: Array<{
  key: string;
  value: SourceFrequency;
}> = [
  { key: 'weekly', value: 'WEEKLY' },
  { key: 'monthly', value: 'MONTHLY' },
];

export const SOURCE_STATUS_OPTIONS: Array<{
  key: string;
  value: SourceStatus;
}> = [
  { key: 'active', value: 'ACTIVE' },
  { key: 'inactive', value: 'INACTIVE' },
];

export const PROCESSING_MODE_OPTIONS: Array<{
  key: string;
  value: ProcessingMode;
}> = [
  { key: 'manual', value: 'MANUAL' },
  { key: 'auto', value: 'AUTO' },
];

export const FREQUENCY_TO_CRON_MAP: Record<SourceFrequency, string> = {
  WEEKLY: '0 0 0 * * 0', // Every Sunday at midnight
  MONTHLY: '0 0 0 1 * *', // First day of every month at midnight
};

export const CRON_TO_FREQUENCY_MAP: Record<string, SourceFrequency> = {
  '0 0 0 * * 0': 'WEEKLY',
  '0 0 0 1 * *': 'MONTHLY',
};
