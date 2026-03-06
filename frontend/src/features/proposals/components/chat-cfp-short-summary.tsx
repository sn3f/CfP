import { ExternalLink, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { CfpAnalysis } from '@/lib/types';

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function FieldSummary({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="font-medium text-sm leading-4">{title}</div>
      <div className="text-muted-foreground leading-4 text-xs">{children}</div>
    </div>
  );
}

/**
 * Compact CFP summary displayed beside the chat view.
 * Shows key data pulled from extractedData JSON.
 */
export function ChatCfpShortSummary({ cfp }: { cfp: CfpAnalysis }) {
  const { t } = useTranslation('translation', { keyPrefix: 'workspace.cfp' });

  const ed = cfp.extractedData;

  const fundingMin = ed.funding_min ?? ed.fundingMin;
  const fundingMax = ed.funding_max ?? ed.fundingMax;
  const currency = ed.funding_currency ?? ed.fundingCurrency ?? 'USD';

  const fundingFormatted =
    fundingMin || fundingMax
      ? `${Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          minimumFractionDigits: 0,
        }).format(fundingMin ?? 0)} – ${Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          minimumFractionDigits: 0,
        }).format(fundingMax ?? 0)}`
      : t('overview.unknown');

  const deadline =
    ed.deadline &&
    new Date(ed.deadline).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  return (
    <Card className="min-w-sm w-full max-w-md hidden lg:flex flex-col h-full">
      <CardHeader>
        <CardTitle>{t('overview.shortSummaryTitle')}</CardTitle>
        <CardDescription>
          {t('overview.shortSummaryDescription')}
        </CardDescription>
        <CardAction>
          <div
            className="bg-primary border rounded-full p-2"
            aria-hidden="true"
          >
            <Info className="size-4 text-primary-foreground" />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="text-sm overflow-y-auto space-y-3 flex-1 min-h-0">
        <FieldSummary title={t('overview.title')}>
          {cfp.extractedData.title || '-'}
        </FieldSummary>

        <FieldSummary title={t('overview.organization')}>
          {ed.organization ?? t('overview.unknown')}
        </FieldSummary>

        {ed.proposal_summary && (
          <FieldSummary title={t('overview.summary')}>
            {ed.proposal_summary}
          </FieldSummary>
        )}

        {Array.isArray(ed.region) && ed.region.length > 0 && (
          <FieldSummary title={t('overview.regions')}>
            {ed.region.join(', ')}
          </FieldSummary>
        )}

        {Array.isArray(ed.sector) && ed.sector.length > 0 && (
          <FieldSummary title={t('overview.sectors')}>
            {ed.sector.join(', ')}
          </FieldSummary>
        )}

        {Array.isArray(ed.theme) && ed.theme.length > 0 && (
          <FieldSummary title={t('overview.themes')}>
            {ed.theme.join(', ')}
          </FieldSummary>
        )}

        {deadline && (
          <FieldSummary title={t('overview.deadline')}>{deadline}</FieldSummary>
        )}

        <FieldSummary title={t('overview.fundingAmount')}>
          {fundingFormatted}
        </FieldSummary>

        {ed.contact && (
          <FieldSummary title={t('overview.contact')}>
            <a href={`mailto:${ed.contact}`} className="text-primary underline">
              {ed.contact}
            </a>
          </FieldSummary>
        )}

        <FieldSummary title={t('overview.source')}>
          <a
            href={cfp.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline inline-flex items-center gap-1"
          >
            <ExternalLink className="size-3 opacity-60" />
            {t('overview.link')}
          </a>
        </FieldSummary>
      </CardContent>
    </Card>
  );
}
