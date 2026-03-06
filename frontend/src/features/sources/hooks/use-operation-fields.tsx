import { useTranslation } from 'react-i18next';
import type { OperationType } from '@/features/sources/lib/types';

/**
 * Returns translated configuration field definitions for each operation type.
 * All labels and placeholders are dynamically loaded from translations.
 */
export function useOperationFields() {
  const { t } = useTranslation('translation', { keyPrefix: 'sources' });

  const fields: Record<
    Exclude<OperationType, 'SCRAP'>,
    Array<{ key: string; label: string; placeholder: string }>
  > = {
    VISIT: [
      {
        key: 'content-selector',
        label: t('dialogs.form.operationFields.content-selector.label'),
        placeholder: t(
          'dialogs.form.operationFields.content-selector.placeholder',
        ),
      },
      {
        key: 'throttle-ms',
        label: t('dialogs.form.operationFields.throttle-ms.label'),
        placeholder: t('dialogs.form.operationFields.throttle-ms.placeholder'),
      },
      {
        key: 'scrap-attachments',
        label: t('dialogs.form.operationFields.scrap-attachments.label'),
        placeholder: t(
          'dialogs.form.operationFields.scrap-attachments.placeholder',
        ),
      },
    ],

    ITERATOR: [
      {
        key: 'item-selector',
        label: t('dialogs.form.operationFields.item-selector.label'),
        placeholder: t(
          'dialogs.form.operationFields.item-selector.placeholder',
        ),
      },
      {
        key: 'next-page-selector',
        label: t('dialogs.form.operationFields.next-page-selector.label'),
        placeholder: t(
          'dialogs.form.operationFields.next-page-selector.placeholder',
        ),
      },
      {
        key: 'scrap-attachments',
        label: t('dialogs.form.operationFields.scrap-attachments.label'),
        placeholder: t(
          'dialogs.form.operationFields.scrap-attachments.placeholder',
        ),
      },
    ],

    CRAWLER: [
      {
        key: 'max-depth',
        label: t('dialogs.form.operationFields.max-depth.label'),
        placeholder: t('dialogs.form.operationFields.max-depth.placeholder'),
      },
      {
        key: 'page-text-query',
        label: t('dialogs.form.operationFields.page-text-query.label'),
        placeholder: t(
          'dialogs.form.operationFields.page-text-query.placeholder',
        ),
      },
      {
        key: 'page-score-threshold',
        label: t('dialogs.form.operationFields.page-score-threshold.label'),
        placeholder: t(
          'dialogs.form.operationFields.page-score-threshold.placeholder',
        ),
      },
      {
        key: 'url-text-query',
        label: t('dialogs.form.operationFields.url-text-query.label'),
        placeholder: t(
          'dialogs.form.operationFields.url-text-query.placeholder',
        ),
      },
      {
        key: 'url-score-threshold',
        label: t('dialogs.form.operationFields.url-score-threshold.label'),
        placeholder: t(
          'dialogs.form.operationFields.url-score-threshold.placeholder',
        ),
      },
      {
        key: 'scrap-attachments',
        label: t('dialogs.form.operationFields.scrap-attachments.label'),
        placeholder: t(
          'dialogs.form.operationFields.scrap-attachments.placeholder',
        ),
      },
    ],
  };

  return fields;
}
