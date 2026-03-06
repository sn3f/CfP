/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import {
  Activity,
  ChartNoAxesGantt,
  Check,
  Clock,
  DollarSign,
  DollarSignIcon,
  ExternalLink,
  Info,
  Mail,
  Shield,
  TimerOff,
  User2,
  X,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { EditCfpModalField } from '@/features/proposals/components/edit-cfp-modal';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import type { CfpAnalysis } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ActivitiesCard } from '@/features/proposals/components/activities-card';
import { EditCfpFieldButton } from '@/features/proposals/components/edit-cfp-field-button';
import { EditCfpModal } from '@/features/proposals/components/edit-cfp-modal';
import { NumberedListCard } from '@/features/proposals/components/numbered-list-card';
import { TimelineCard } from '@/features/proposals/components/timeline-card';
import {
  ORGANIZATION_ELIGIBILITY_KEYS,
  REQUIRES_CO_FINANCING_KEYS,
} from '@/features/proposals/lib/constants';
import { cn } from '@/lib/utils';

type TextCardVariant = 'default' | 'stat' | 'compact';

type BadgeListProps = {
  label: ReactNode;
  items: Array<string>;
  className?: string;
  onEdit?: () => void;
};

type TextCardProps = {
  title: ReactNode;
  description?: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  bgClass?: string;
  variant?: TextCardVariant;
  className?: string;
};

const BadgeList = ({ label, items }: BadgeListProps) => (
  <div className="flex flex-col space-y-1">
    <span className="font-mono text-md text-muted-foreground">{label}</span>
    <div className="flex flex-wrap gap-1">
      {items.length ? (
        items.map((item) => (
          <Badge
            key={item}
            variant="secondary"
            className="border px-2 text-sm font-normal text-foreground"
          >
            {item}
          </Badge>
        ))
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      )}
    </div>
  </div>
);

const TextCard = ({
  title,
  description,
  hint,
  icon: Icon,
  bgClass,
  variant = 'default',
  className,
}: TextCardProps) => (
  <Card className={cn('gap-2 flex-1', className)}>
    <CardHeader>
      <CardTitle
        className={cn('text-md text-foreground', {
          'text-lg font-normal text-muted-foreground': variant === 'stat',
          'text-md font-medium text-muted-foreground': variant === 'compact',
        })}
      >
        {title}
      </CardTitle>

      <CardDescription
        className={cn('', {
          'text-2xl font-bold text-foreground': variant === 'stat',
          'text-lg font-semibold text-foreground': variant === 'compact',
        })}
      >
        {description ?? '—'}
      </CardDescription>

      {variant !== 'default' && (
        <CardAction>
          <div
            className={cn('rounded-full border p-2', {
              'bg-muted': !bgClass,
              [bgClass!]: !!bgClass,
            })}
            aria-hidden
          >
            {Icon && <Icon className="size-5 opacity-60" />}
          </div>
        </CardAction>
      )}
    </CardHeader>

    {hint && (
      <CardFooter>
        <span className="text-xs italic line-clamp-3 text-muted-foreground">
          {hint}
        </span>
      </CardFooter>
    )}
  </Card>
);

function formatDate(dateString?: string): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return isNaN(date.getTime())
    ? '—'
    : date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
}

function formatFundingRange(
  min?: number,
  max?: number,
  currency: string = 'USD',
) {
  if (min == null && max == null) return '—';
  const fmt = (v?: number) =>
    typeof v === 'number'
      ? v.toLocaleString('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      })
      : '';
  return `${fmt(min)}${min && max ? ' - ' : ''}${fmt(max)}`;
}

function HeaderCard({
  cfp,
  isILOEligible,
  ILOEligibleCriteria,
  t,
  onEdit,
}: {
  cfp: CfpAnalysis;
  isILOEligible: boolean;
  ILOEligibleCriteria: Array<any>;
  t: (key: string, args?: any) => string;
  onEdit: (field: EditCfpModalField) => void;
}) {
  const bgClass = isILOEligible ? 'bg-success/25' : 'bg-destructive/25';
  const organization = cfp.extractedData?.organization;
  const summary = cfp.extractedData?.proposal_summary;

  return (
    <Card className={cn('p-0 gap-0 border-none border-b', bgClass)}>
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>
            <div className="flex items-center gap-2">
              <a
                href={cfp.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-2xl hover:underline text-primary items-center flex gap-2 text-pretty"
              >
                {cfp.extractedData?.title ||
                  t('workspace.cfp.overview.unknown')}
                <ExternalLink
                  className="inline-block size-4 shrink-0"
                  aria-hidden
                />
              </a>
              <EditCfpFieldButton
                field={{
                  scope: 'extractedData',
                  field: 'title',
                  variant: 'string',
                  title: t('workspace.cfp.columns.title'),
                }}
                onEdit={onEdit}
                tooltip={t('workspace.cfp.overview.edit.title')}
                ariaLabel={t('workspace.cfp.overview.edit.title')}
              />
            </div>
          </CardTitle>
          <CardDescription className="text-sm font-semibold text-foreground">
            <div className="flex items-center gap-2">
              <span>{organization ?? t('workspace.cfp.overview.unknown')}</span>
              <EditCfpFieldButton
                field={{
                  scope: 'extractedData',
                  field: 'organization',
                  variant: 'string',
                  title: t('workspace.cfp.columns.organization'),
                }}
                onEdit={onEdit}
                tooltip={t('workspace.cfp.overview.edit.title')}
                ariaLabel={t('workspace.cfp.overview.edit.title')}
              />
            </div>
          </CardDescription>
        </CardHeader>

        <CardContent className="text-muted-foreground">
          {summary ?? t('workspace.cfp.overview.unknown')}
          <EditCfpFieldButton
            field={{
              scope: 'extractedData',
              field: 'proposal_summary',
              variant: 'string',
              title: t('workspace.cfp.columns.proposal_summary'),
            }}
            onEdit={onEdit}
            tooltip={t('workspace.cfp.overview.edit.title')}
            ariaLabel={t('workspace.cfp.overview.edit.title')}
          />
        </CardContent>

        <CardFooter>
          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 md:gap-8">
            <BadgeList
              label={
                <div className="flex items-center gap-2">
                  <span>{t('workspace.cfp.overview.regions')}</span>
                  <EditCfpFieldButton
                    field={{
                      scope: 'extractedData',
                      field: 'regions',
                      variant: 'tags',
                      title: t('workspace.cfp.overview.regions'),
                    }}
                    onEdit={onEdit}
                    tooltip={t('workspace.cfp.overview.edit.title')}
                    ariaLabel={t('workspace.cfp.overview.edit.title')}
                  />
                </div>
              }
              items={cfp.extractedData?.regions ?? []}
            />
            <BadgeList
              label={
                <div className="flex items-center gap-2">
                  <span>{t('workspace.cfp.overview.countries')}</span>
                  <EditCfpFieldButton
                    field={{
                      scope: 'extractedData',
                      field: 'country',
                      variant: 'tags',
                      title: t('workspace.cfp.overview.countries'),
                    }}
                    onEdit={onEdit}
                    tooltip={t('workspace.cfp.overview.edit.title')}
                    ariaLabel={t('workspace.cfp.overview.edit.title')}
                  />
                </div>
              }
              items={cfp.extractedData?.country ?? []}
            />
            <BadgeList
              label={
                <div className="flex items-center gap-2">
                  <span>{t('workspace.cfp.overview.themes')}</span>
                  <EditCfpFieldButton
                    field={{
                      scope: 'extractedData',
                      field: 'theme',
                      variant: 'tags',
                      title: t('workspace.cfp.overview.themes'),
                    }}
                    onEdit={onEdit}
                    tooltip={t('workspace.cfp.overview.edit.title')}
                    ariaLabel={t('workspace.cfp.overview.edit.title')}
                  />
                </div>
              }
              items={cfp.extractedData?.theme ?? []}
            />
          </div>
        </CardFooter>
      </Card>

      <EligibilityStatus
        isEligible={isILOEligible}
        evidence={ILOEligibleCriteria[0]?.evidence}
        onEdit={onEdit}
        t={t}
      />
    </Card>
  );
}

function EligibilityStatus({
  isEligible,
  evidence,
  onEdit,
  t,
}: {
  isEligible: boolean;
  evidence?: string;
  onEdit: (field: EditCfpModalField) => void;
  t: (key: string, args?: any) => string;
}) {
  return (
    <div className="size-full p-4">
      {isEligible ? (
        <div className="flex items-center gap-3 text-success">
          <Check className="size-8" aria-hidden />
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2">
              <span className="text-md font-medium">
                {t('workspace.cfp.overview.iloEligible')}
              </span>
              {ORGANIZATION_ELIGIBILITY_KEYS.length > 0 && (
                <EditCfpFieldButton
                  field={{
                    scope: 'root',
                    field: 'criteria',
                    variant: 'criteriaByFieldName',
                    criterionFieldName: ORGANIZATION_ELIGIBILITY_KEYS,
                    title: t('workspace.cfp.overview.iloEligible'),
                  }}
                  onEdit={onEdit}
                  tooltip={t('workspace.cfp.overview.edit.title')}
                  ariaLabel={t('workspace.cfp.overview.edit.title')}
                />
              )}
            </div>
            <span className="text-sm break-words text-success/80">
              {evidence}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-destructive">
          <X className="size-8" aria-hidden />
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2">
              <span className="text-md font-medium">
                {t('workspace.cfp.overview.iloNotEligible')}
              </span>
              {ORGANIZATION_ELIGIBILITY_KEYS.length > 0 && (
                <EditCfpFieldButton
                  field={{
                    scope: 'root',
                    field: 'criteria',
                    variant: 'criteriaByFieldName',
                    criterionFieldName: ORGANIZATION_ELIGIBILITY_KEYS,
                    title: t('workspace.cfp.overview.iloNotEligible'),
                  }}
                  onEdit={onEdit}
                  tooltip={t('workspace.cfp.overview.edit.title')}
                  ariaLabel={t('workspace.cfp.overview.edit.title')}
                />
              )}
            </div>
            <span className="text-sm break-words">{evidence}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function OverviewTab({ cfp }: { cfp: CfpAnalysis }) {
  const { t } = useTranslation();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeEditField, setActiveEditField] =
    useState<EditCfpModalField | null>(null);

  if (!cfp) return null;

  const ILOEligibleCriteria =
    cfp.criteria?.filter((c) =>
      ORGANIZATION_ELIGIBILITY_KEYS.includes(c.type.fieldName),
    ) ?? [];

  const coFinancingCriteria =
    cfp.criteria?.filter((c) =>
      REQUIRES_CO_FINANCING_KEYS.includes(c.type.fieldName),
    ) ?? [];

  const isCoFinancingRequired =
    coFinancingCriteria[0]?.status === 'true'
      ? true
      : coFinancingCriteria[0]?.status === 'false'
        ? false
        : undefined;

  const isILOEligible = ILOEligibleCriteria[0]?.status === 'true';

  const openEditModal = (field: EditCfpModalField) => {
    setActiveEditField(field);
    setIsEditModalOpen(true);
  };

  const infoCards: Array<TextCardProps> = [
    {
      title: (
        <div className="flex items-center gap-2">
          <span>{t('workspace.cfp.overview.deadline')}</span>
          <EditCfpFieldButton
            field={{
              scope: 'root',
              field: 'deadline',
              variant: 'date',
              title: t('workspace.cfp.overview.deadline'),
            }}
            onEdit={() => {
              openEditModal({
                scope: 'root',
                field: 'deadline',
                variant: 'date',
                title: t('workspace.cfp.overview.deadline'),
              });
            }}
            tooltip={t('workspace.cfp.overview.edit.title')}
            ariaLabel={t('workspace.cfp.overview.edit.title')}
          />
        </div>
      ),
      description: formatDate(cfp.deadline),
      icon: TimerOff,
      bgClass: 'bg-chart-1/50',
      variant: 'stat',
    },
    {
      title: (
        <div className="flex items-center gap-2">
          <span>{t('workspace.cfp.overview.fundingAmount')}</span>
          <EditCfpFieldButton
            field={{
              scope: 'extractedData',
              field: 'fundingAmount',
              variant: 'fundingRange',
              title: t('workspace.cfp.overview.fundingAmount'),
            }}
            onEdit={() => {
              openEditModal({
                scope: 'extractedData',
                field: 'fundingAmount',
                variant: 'fundingRange',
                title: t('workspace.cfp.overview.fundingAmount'),
              });
            }}
            tooltip={t('workspace.cfp.overview.edit.title')}
            ariaLabel={t('workspace.cfp.overview.edit.title')}
          />
        </div>
      ),
      description: formatFundingRange(
        cfp.extractedData?.funding_min,
        cfp.extractedData?.funding_max,
        cfp.extractedData?.funding_currency,
      ),
      icon: DollarSign,
      bgClass: 'bg-chart-3/50',
      variant: 'stat',
    },
  ];

  const secondaryCards: Array<TextCardProps> = [
    {
      title: (
        <div className="flex items-center gap-2">
          <span>{t('workspace.cfp.overview.coFinancing')}</span>
          <EditCfpFieldButton
            field={{
              scope: 'root',
              field: 'criteria',
              variant: 'criteriaByFieldName',
              criterionFieldName: REQUIRES_CO_FINANCING_KEYS,
              title: t('workspace.cfp.overview.coFinancing'),
            }}
            onEdit={openEditModal}
            tooltip={t('workspace.cfp.overview.edit.title')}
            ariaLabel={t('workspace.cfp.overview.edit.title')}
          />
        </div>
      ),
      description: (
        <span>
          {isCoFinancingRequired === true
            ? t('workspace.cfp.overview.yes')
            : isCoFinancingRequired === false
              ? t('workspace.cfp.overview.no')
              : t('workspace.cfp.overview.unknown')}
          {coFinancingCriteria[0]?.evidence
            ? '. ' + coFinancingCriteria[0]?.evidence
            : ''}
        </span>
      ),
      icon: DollarSignIcon,
      variant: 'compact',
    },
    {
      title: (
        <div className="flex items-center gap-2">
          <span>{t('workspace.cfp.overview.implementationPeriod')}</span>
          <EditCfpFieldButton
            field={{
              scope: 'extractedData',
              field: 'implementationPeriod',
              variant: 'string',
              title: t('workspace.cfp.overview.implementationPeriod'),
            }}
            onEdit={() => {
              openEditModal({
                scope: 'extractedData',
                field: 'implementationPeriod',
                variant: 'string',
                title: t('workspace.cfp.overview.implementationPeriod'),
              });
            }}
            tooltip={t('workspace.cfp.overview.edit.title')}
            ariaLabel={t('workspace.cfp.overview.edit.title')}
          />
        </div>
      ),
      description: cfp.extractedData?.implementationPeriod ?? '—',
      icon: ChartNoAxesGantt,
      variant: 'compact',
    },
  ];

  const additionalInfoCriteria =
    cfp.criteria
      ?.filter((c) => !c.type.hard)
      .filter((c) => !REQUIRES_CO_FINANCING_KEYS.includes(c.type.fieldName)) ??
    [];

  const getSafeHref = (link: string) => {
    if (!link) return '#';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(link)) {
      return `mailto:${link}`;
    }

    if (link.startsWith('http://') || link.startsWith('https://')) {
      return link;
    }

    return `https://${link}`;
  };

  return (
    <div>
      <HeaderCard
        cfp={cfp}
        isILOEligible={isILOEligible}
        ILOEligibleCriteria={ILOEligibleCriteria}
        t={t}
        onEdit={openEditModal}
      />

      {/* Relevance */}
      {cfp.extractedData?.match && (
        <div className="mt-2">
          <Card className="flex-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-md font-medium text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>
                    {t('workspace.cfp.columns.match')}
                    {cfp.extractedData.match.value != null &&
                      ` (${Math.round(cfp.extractedData.match.value * 100)}%)`}
                  </span>
                  <EditCfpFieldButton
                    field={{
                      scope: 'extractedData',
                      field: 'match',
                      variant: 'match',
                      title: t('workspace.cfp.columns.match'),
                    }}
                    onEdit={openEditModal}
                    tooltip={t('workspace.cfp.overview.edit.title')}
                    ariaLabel={t('workspace.cfp.overview.edit.title')}
                  />
                </div>
              </CardTitle>
              <div className="rounded-full border p-2 bg-muted">
                <Zap className="size-5 opacity-60" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {cfp.extractedData.match.evidence}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Funding + Deadline */}
      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
        {infoCards.map((card, idx) => (
          <TextCard key={idx} {...card} />
        ))}
      </div>

      {/* Co-Financing + Implementation Period */}
      <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
        {secondaryCards.map((card, idx) => (
          <TextCard key={idx} {...card} />
        ))}
      </div>

      {/* Eligible Activities + Restrictions */}
      <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
        <NumberedListCard
          title={
            <div className="flex items-center gap-2">
              <span>
                {t('workspace.cfp.overview.eligibleActivities.title')}
              </span>
              <EditCfpFieldButton
                field={{
                  scope: 'extractedData',
                  field: 'eligibleActivities',
                  variant: 'list',
                  title: t('workspace.cfp.overview.eligibleActivities.title'),
                }}
                onEdit={openEditModal}
                tooltip={t('workspace.cfp.overview.edit.title')}
                ariaLabel={t('workspace.cfp.overview.edit.title')}
              />
            </div>
          }
          description={t(
            'workspace.cfp.overview.eligibleActivities.description',
          )}
          items={cfp.extractedData?.eligibleActivities ?? []}
          emptyText={t('workspace.cfp.overview.eligibleActivities.empty')}
          icon={<Activity className="size-5 opacity-60" aria-hidden />}
          iconBgClass="bg-chart-2/20"
        />

        <NumberedListCard
          title={
            <div className="flex items-center gap-2">
              <span>
                {t('workspace.cfp.overview.fundingRestrictions.title')}
              </span>
              <EditCfpFieldButton
                field={{
                  scope: 'extractedData',
                  field: 'fundingRestrictions',
                  variant: 'list',
                  title: t('workspace.cfp.overview.fundingRestrictions.title'),
                }}
                onEdit={openEditModal}
                tooltip={t('workspace.cfp.overview.edit.title')}
                ariaLabel={t('workspace.cfp.overview.edit.title')}
              />
            </div>
          }
          description={t(
            'workspace.cfp.overview.fundingRestrictions.description',
          )}
          items={cfp.extractedData?.fundingRestrictions ?? []}
          emptyText={t('workspace.cfp.overview.fundingRestrictions.empty')}
          icon={<Shield className="size-5 opacity-60" aria-hidden />}
          iconBgClass="bg-chart-1/20"
        />
      </div>

      {/* Application Process, Additional Info, Eligible Orgs */}
      <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2 h-full">
        <div className="flex flex-col gap-2 h-full">
          <TimelineCard
            title={
              <div className="flex items-center gap-2">
                <span>
                  {t('workspace.cfp.overview.applicationProcess.title')}
                </span>
                <EditCfpFieldButton
                  field={{
                    scope: 'extractedData',
                    field: 'applicationProcess',
                    variant: 'applicationProcess',
                    title: t('workspace.cfp.overview.applicationProcess.title'),
                  }}
                  onEdit={openEditModal}
                  tooltip={t('workspace.cfp.overview.edit.title')}
                  ariaLabel={t('workspace.cfp.overview.edit.title')}
                />
              </div>
            }
            description={t(
              'workspace.cfp.overview.applicationProcess.description',
            )}
            icon={Clock}
            items={cfp.extractedData?.applicationProcess ?? []}
            className="flex-1"
          />

          <ActivitiesCard
            title={
              <div className="flex items-center gap-2">
                <span>{t('workspace.cfp.overview.additionalInfo.title')}</span>
                <EditCfpFieldButton
                  field={{
                    scope: 'root',
                    field: 'criteria',
                    variant: 'additionalInfoCriteria',
                    title: t('workspace.cfp.overview.additionalInfo.title'),
                  }}
                  onEdit={openEditModal}
                  tooltip={t('workspace.cfp.overview.edit.title')}
                  ariaLabel={t('workspace.cfp.overview.edit.title')}
                />
              </div>
            }
            description={t('workspace.cfp.overview.additionalInfo.description')}
            items={additionalInfoCriteria}
            emptyText={t('workspace.cfp.overview.additionalInfo.empty')}
            icon={<Info className="size-5 opacity-60" aria-hidden />}
            iconBgClass="bg-chart-2/50"
            className="flex-1"
          />
        </div>

        <div className="flex flex-col gap-2 h-full">
          <NumberedListCard
            title={
              <div className="flex items-center gap-2">
                <span>
                  {t('workspace.cfp.overview.eligibleOrganizations.title')}
                </span>
                <EditCfpFieldButton
                  field={{
                    scope: 'extractedData',
                    field: 'organization_type',
                    variant: 'list',
                    title: t(
                      'workspace.cfp.overview.eligibleOrganizations.title',
                    ),
                  }}
                  onEdit={openEditModal}
                  tooltip={t('workspace.cfp.overview.edit.title')}
                  ariaLabel={t('workspace.cfp.overview.edit.title')}
                />
              </div>
            }
            description={t(
              'workspace.cfp.overview.eligibleOrganizations.description',
            )}
            items={cfp.extractedData?.organization_type ?? []}
            emptyText={t('workspace.cfp.overview.eligibleOrganizations.empty')}
            icon={<User2 className="size-5 opacity-60" aria-hidden />}
            iconBgClass="bg-secondary/50"
            className="flex-1"
          />
        </div>
      </div>

      {/* Source, Focal Person, Contact, Development Cooperation Dashboard*/}
      <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-2 h-full">
        <div className="flex flex-col gap-2 h-full">
          <TextCard
            title={
              <div className="flex items-center gap-2">
                <span>{t('workspace.cfp.overview.contact')}</span>
                <EditCfpFieldButton
                  field={{
                    scope: 'extractedData',
                    field: 'contact',
                    variant: 'string',
                    title: t('workspace.cfp.overview.contact'),
                  }}
                  onEdit={openEditModal}
                  tooltip={t('workspace.cfp.overview.edit.title')}
                  ariaLabel={t('workspace.cfp.overview.edit.title')}
                />
              </div>
            }
            description={
              cfp.extractedData?.contact ? (
                <a
                  className="text-xl hover:underline text-primary items-center flex gap-2 text-pretty"
                  href={getSafeHref(cfp.extractedData.contact)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {cfp.extractedData.contact}
                  <ExternalLink
                    className="inline-block size-4 shrink-0"
                    aria-hidden
                  />
                </a>
              ) : (
                '—'
              )
            }
            icon={Mail}
            bgClass="bg-muted/50"
            variant="default"
          />
        </div>
        <div className="flex flex-col gap-2 h-full">
          <TextCard
            title={
              <div className="flex items-center gap-2">
                <span>{t('workspace.cfp.overview.source')}</span>
                <EditCfpFieldButton
                  field={{
                    scope: 'root',
                    field: 'url',
                    variant: 'string',
                    title: t('workspace.cfp.overview.source'),
                  }}
                  onEdit={openEditModal}
                  tooltip={t('workspace.cfp.overview.edit.title')}
                  ariaLabel={t('workspace.cfp.overview.edit.title')}
                />
              </div>
            }
            description={
              cfp.url ? (
                <a
                  href={cfp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xl hover:underline text-primary items-center flex gap-2 text-pretty"
                >
                  {cfp.extractedData?.title ||
                    t('workspace.cfp.overview.unknown')}
                  <ExternalLink
                    className="inline-block size-4 shrink-0"
                    aria-hidden
                  />
                </a>
              ) : (
                '—'
              )
            }
            bgClass="bg-muted/50"
            variant="default"
            className="flex-1"
          />
        </div>
        <div className="flex flex-col gap-2 h-full">
          <TextCard
            title={t('workspace.cfp.overview.focalPerson.label')}
            description={
              <div className="text-base text-foreground">
                <span>{t('workspace.cfp.overview.focalPerson.text')}</span>
                <a
                  href="https://iloprod.sharepoint.com/sites/partnerships/SitePages/Who-does-what.aspx?web=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className=" hover:underline text-primary items-center inline-flex gap-1 text-pretty"
                >
                  {t('workspace.cfp.overview.focalPerson.link')}
                  <ExternalLink className="size-3 shrink-0" aria-hidden />
                </a>
              </div>
            }
            variant="default"
            className="flex-1"
          />
        </div>
        <div className="flex flex-col gap-2 h-full">
          <TextCard
            title={t(
              'workspace.cfp.overview.developmentCooperationDashboard.label',
            )}
            description={
              <div className="text-base text-foreground">
                <a
                  href="https://webapps.ilo.org/DevelopmentCooperationDashboard/#aai0ie6"
                  target="_blank"
                  rel="noopener noreferrer"
                  className=" hover:underline text-primary items-center inline-flex gap-1 text-pretty"
                >
                  {t(
                    'workspace.cfp.overview.developmentCooperationDashboard.text',
                  )}
                  <ExternalLink className="size-3 shrink-0" aria-hidden />
                </a>
              </div>
            }
            variant="default"
            className="flex-1"
          />
        </div>
      </div>

      <EditCfpModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        cfp={cfp}
        activeField={activeEditField}
      />
    </div>
  );
}
