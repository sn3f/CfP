/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { Link } from '@tanstack/react-router';
import {
  CheckIcon,
  EditIcon,
  EllipsisIcon,
  RecycleIcon,
  TrashIcon,
  X,
} from 'lucide-react';
import type { ColumnDef, Row } from '@tanstack/react-table';

import type { CfpAnalysis } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { ORGANIZATION_ELIGIBILITY_KEYS } from '@/features/proposals/lib/constants';

export const getColumns = (
  t: (key: string, args?: any) => string,
  onDelete?: (id: number) => void,
  isAdmin?: boolean,
  onEdit?: (cfp: CfpAnalysis) => void,
  onReclassify?: (cfp: CfpAnalysis) => void,
): Array<ColumnDef<CfpAnalysis>> => {
  const RowActions = ({ row }: { row: Row<CfpAnalysis> }) => {
    const id = row.original.id;

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex justify-end">
            <Button
              size="icon"
              variant="ghost"
              className="shadow-none"
              aria-label={t('actionsMenu')}
            >
              <EllipsisIcon size={16} aria-hidden="true" />
            </Button>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link
                to="/proposals/$id"
                params={{ id: row.original.id.toString() }}
                search={{ tab: 'overview' }}
                className="w-full"
              >
                <span>{t('actions.viewDetails')}</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onReclassify?.(row.original)}>
                <RecycleIcon size={16} aria-hidden="true" />
                <span>{t('actions.reclassify')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.(row.original)}>
                <EditIcon size={16} aria-hidden="true" />
                <span>{t('actions.edit')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete?.(id)}
              >
                <TrashIcon size={16} aria-hidden="true" />
                <span>{t('actions.delete')}</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label={t('selectAll')}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label={t('selectRow')}
        />
      ),
      size: 28,
      enableSorting: false,
      enableHiding: false,
    },
    {
      header: t('columns.organization'),
      accessorKey: 'organizationName',
      cell: ({ row }) => {
        const org =
          row.original.extractedData?.organization ?? t('common.unknown');
        return <div className="font-normal line-clamp-3">{org}</div>;
      },
      enableHiding: false,
      enableSorting: false,
    },
    {
      header: t('columns.title'),
      accessorKey: 'title',
      cell: ({ row }) => (
        <div className="max-w-xs">
          <Link
            to="/proposals/$id"
            params={{ id: row.original.id.toString() }}
            search={{ tab: 'overview' }}
            className="font-medium underline"
          >
            {row.original.extractedData?.title ?? t('common.noTitle')}
          </Link>
        </div>
      ),
      enableSorting: false,
    },
    {
      header: t('columns.eligible'),
      accessorKey: 'eligible',
      cell: ({ row }) => {
        const criteria = row.original?.criteria ?? [];

        const isILOEligible =
          criteria?.some(
            (c) =>
              c.status === 'true' &&
              ORGANIZATION_ELIGIBILITY_KEYS.includes(c.type.fieldName),
          ) ?? false;

        return (
          <div className="max-w-sm text-sm text-muted-foreground line-clamp-3">
            {isILOEligible ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="gap-1 whitespace-normal text-left"
                  >
                    <CheckIcon
                      className="text-emerald-500 shrink-0"
                      size={12}
                      aria-hidden="true"
                    />
                    <span>{t('overview.eligible')}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('overview.eligible')}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="gap-1 whitespace-normal text-left"
                  >
                    <X
                      className="text-red-500 shrink-0"
                      size={12}
                      aria-hidden="true"
                    />
                    <span>{t('overview.notEligible')}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('overview.notEligible')}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        );
      },
      size: 140,
      enableSorting: false,
    },
    {
      header: t('columns.match'),
      accessorKey: 'match',
      cell: ({ row }) => {
        const value = row.original?.extractedData?.match?.value;
        const evidence = row.original?.extractedData?.match?.evidence;

        if (value === null || value === undefined) {
          return <span className="text-sm font-medium">—</span>;
        }

        const percentageDisplay = `${Math.round(value * 100)}%`;

        if (!evidence) {
          return <span className="text-sm font-medium">{percentageDisplay}</span>;
        }

        return (
          <Tooltip>
            <TooltipTrigger>
              <span className="text-sm font-medium border-b border-dotted border-muted-foreground/40 cursor-help">
                {percentageDisplay}
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>{evidence}</p>
            </TooltipContent>
          </Tooltip>
        );
      },
      size: 120,
      enableSorting: true,
    },
    {
      header: t('columns.region'),
      accessorKey: 'region',
      cell: ({ row }) => {
        const regions: Array<string> =
          row.original.extractedData?.regions ?? [];

        if (regions.length === 0) return <span>—</span>;

        return (
          <div className="flex flex-wrap gap-1">
            {regions.slice(0, 2).map((region, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs max-w-[120px] text-left justify-start"
                title={region}
              >
                <span className="block truncate">{region}</span>
              </Badge>
            ))}
            {regions.length > 2 && (
              <Badge
                variant="secondary"
                className="text-xs"
                title={regions.slice(2).join('\n')}
              >
                +{regions.length - 2}
              </Badge>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      header: t('columns.country'),
      accessorKey: 'country',
      cell: ({ row }) => {
        const countries: Array<string> =
          row.original.extractedData?.country ?? [];

        if (countries.length === 0) return <span>—</span>;

        return (
          <div className="flex flex-wrap gap-1">
            {countries.slice(0, 2).map((country, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs max-w-[120px] text-left justify-start"
                title={country}
              >
                <span className="block truncate">{country}</span>
              </Badge>
            ))}
            {countries.length > 2 && (
              <Badge
                variant="secondary"
                className="text-xs"
                title={countries.slice(2).join('\n')}
              >
                +{countries.length - 2}
              </Badge>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
    // Themes -> Topics
    {
      header: t('columns.themes'),
      accessorKey: 'themes',
      cell: ({ row }) => {
        const topics: Array<string> = row.original.extractedData?.theme ?? [];

        if (topics.length === 0) return <span>—</span>;

        return (
          <div className="flex flex-wrap gap-1">
            {topics.slice(0, 2).map((topic, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="text-xs max-w-[120px] text-left justify-start"
                title={topic}
              >
                <span className="block truncate">{topic}</span>
              </Badge>
            ))}
            {topics.length > 2 && (
              <Badge
                variant="secondary"
                className="text-xs"
                title={topics.slice(2).join('\n')}
              >
                +{topics.length - 2}
              </Badge>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      header: t('columns.deadline'),
      accessorKey: 'deadline',
      cell: ({ row }) => {
        const dateStr: string | undefined = row.original.deadline;
        if (!dateStr) return <span>{t('deadline.unknown')}</span>;
        const deadline = new Date(dateStr);
        const now = new Date();
        const daysLeft = Math.ceil(
          (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        const formattedDate = deadline.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });

        return (
          <div className="text-sm">
            <div className="font-medium">{formattedDate}</div>
            <div
              className={cn(
                'text-xs font-mono',
                daysLeft < 0
                  ? 'text-red-600'
                  : daysLeft < 7
                    ? 'text-red-600'
                    : daysLeft < 30
                      ? 'text-orange-600'
                      : 'text-green-600',
              )}
            >
              {daysLeft > 0
                ? t('deadline.daysLeft', { count: daysLeft })
                : t('deadline.expired')}
            </div>
          </div>
        );
      },
      size: 100,
      enableSorting: true,
    },
    {
      header: t('columns.fundingAmount'),
      accessorKey: 'fundingAmount',
      cell: ({ row }) => {
        const data = row.original.extractedData ?? {};
        const currency = data.funding_currency ?? 'USD';
        const min = data.funding_min ?? 0;
        const max = data.funding_max ?? 0;

        const formatter = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        });

        return (
          <div className="text-sm font-medium">
            {min || max
              ? `${formatter.format(min)} - ${formatter.format(max)}`
              : t('common.noData')}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      header: t('columns.timestamp'),
      accessorKey: 'timestamp',
      cell: ({ row }) => {
        const dateStr = row.original.timestamp;
        if (!dateStr) return <span>—</span>;
        const date = new Date(dateStr);
        return (
          <div className="text-sm">
            {date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </div>
        );
      },
      size: 120,
      enableSorting: true,
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">{t('columns.actions')}</span>,
      cell: ({ row }) => <RowActions row={row} />,
      size: 60,
      enableHiding: false,
    },
  ];
};
