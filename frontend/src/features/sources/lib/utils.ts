import { CronExpressionParser } from 'cron-parser';
import type { SourceFrequency } from '@/features/sources/lib/types.ts';
import {
  CRON_TO_FREQUENCY_MAP,
  FREQUENCY_TO_CRON_MAP,
} from '@/features/sources/lib/constants.ts';

export const frequencyToCron = (frequency: SourceFrequency): string => {
  return FREQUENCY_TO_CRON_MAP[frequency];
};

export const cronToFrequency = (cron: string): SourceFrequency => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return CRON_TO_FREQUENCY_MAP[cron] || 'MONTHLY';
};

export const getNextExecutionDate = (cronExpression: string): Date | null => {
  if (!cronExpression || !cronExpression.includes('*')) {
    return null;
  }

  try {
    const interval = CronExpressionParser.parse(cronExpression);
    return interval.next().toDate();
  } catch (error) {
    return null;
  }
};
