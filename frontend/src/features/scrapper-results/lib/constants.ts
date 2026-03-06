import type { ScrapperResultStatus } from './types';

export const SCRAPPER_RESULT_STATUS_OPTIONS: Array<{
  key: string;
  value: ScrapperResultStatus;
}> = [
  { key: 'new', value: 'NEW' },
  { key: 'classified_auto', value: 'CLASSIFIED_AUTO' },
  { key: 'failed', value: 'FAILED' },
  { key: 'classified_manually', value: 'CLASSIFIED_MANUALLY' },
  { key: 'rejected', value: 'REJECTED' },
];
