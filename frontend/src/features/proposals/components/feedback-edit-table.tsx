import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { CircleAlert, Columns3Icon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type {
  CellContext,
  ColumnDef,
  RowData,
  VisibilityState,
} from '@tanstack/react-table';

import type {
  FeedbackSummary,
  FeedbackSummaryItem,
  FeedbackSummaryItemType,
} from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { updateUserFeedbackApi } from '@/features/proposals/lib/feedback-api';
import { cfpFeedbackKeys } from '@/lib/key-factory';

declare module '@tanstack/react-table' {
  interface TableMeta<TData extends RowData> {
    updateData: <TColumnKey extends keyof TData>(
      rowIndex: number,
      columnId: TColumnKey,
      value: unknown,
    ) => void;
  }
}

export function NameCell(props: CellContext<FeedbackSummaryItem, string>) {
  const row = props.row.original;
  const { t } = useTranslation('translation', {
    keyPrefix: 'workspace.cfp.feedback',
  });
  const isCriterionType = row.type === 'CRITERION';

  if (!isCriterionType) {
    return (
      <p className="text-sm font-medium text-pretty">
        {t(`${row.name}`, row.name)}
      </p>
    );
  }

  return <p className="text-sm font-medium text-pretty">{row.name}</p>;
}

export function TypeCell<T extends object>(props: CellContext<T, string>) {
  const raw = props.getValue() as FeedbackSummaryItemType;
  const { t } = useTranslation('translation', {
    keyPrefix: 'workspace.cfp.feedback',
  });

  return (
    <Badge variant="outline" className="gap-1.5">
      <span className="size-1.5 rounded-full bg-primary" />
      {t(`type.${raw}`)}
    </Badge>
  );
}

function parseValue(raw: string): unknown {
  if (raw === '') return '';

  const trimmed = raw.trim();

  try {
    const isArray = trimmed.startsWith('[') && trimmed.endsWith(']');
    const isArrayOfObjects =
      isArray && trimmed.includes('{') && trimmed.includes('}');
    const spliced = isArray ? trimmed.slice(1, -1).trim() : trimmed;

    // Array of primitives
    if (isArray && !isArrayOfObjects) {
      return spliced.split(',').map((item) => item.trim());
    }

    // Array of objects
    if (isArrayOfObjects) {
      const trimmedObjects = spliced
        .split('},')
        .map((item) => (item.endsWith('}') ? item : `${item}}`));

      const readableFormat = trimmedObjects.map((text) => {
        const matches = [...text.matchAll(/=(.*?)(?=,|})/g)];

        return matches.map((m) => m[1].trim());
      });

      return readableFormat.map((arr) => arr.join('; '));
    }

    const lower = trimmed.toLowerCase();
    if (['true', 'false'].includes(lower)) return lower === 'true';

    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const d = new Date(trimmed);
      if (!isNaN(+d)) return d;
    }

    if (/^https?:\/\/\S+$/i.test(trimmed)) return trimmed;

    return trimmed;
  } catch {
    return raw;
  }
}

export function ReadonlyTextCell<T extends object>(
  props: CellContext<T, string>,
) {
  const raw = props.getValue();
  if (!raw || raw === '') {
    return <span className="text-muted-foreground">—</span>;
  }

  const parsed = parseValue(raw);

  // Boolean
  if (typeof parsed === 'boolean') {
    return (
      <Badge
        variant={parsed ? 'default' : 'secondary'}
        className={cn(
          'px-2 py-0.5 text-xs',
          parsed
            ? 'bg-success/15 text-success'
            : 'bg-destructive/10 text-destructive',
        )}
      >
        {parsed ? 'True' : 'False'}
      </Badge>
    );
  }

  // Number
  if (typeof parsed === 'number')
    return (
      <div className="text-sm tabular-nums text-primary">
        {parsed.toLocaleString()}
      </div>
    );

  // Date
  if (parsed instanceof Date)
    return (
      <div className="text-sm text-primary">
        {parsed.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </div>
    );

  // URL
  if (typeof parsed === 'string' && /^https?:\/\//i.test(parsed))
    return (
      <a
        href={parsed}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline break-all text-xs"
      >
        {parsed}
      </a>
    );

  // Array of objects
  if (Array.isArray(parsed) && typeof parsed[0] === 'object')
    return (
      <ul className="space-y-1 list-disc list-inside">
        {parsed.map((obj, i) => (
          <li key={i} className="text-sm">
            {Object.entries(obj as Record<string, unknown>).map(([k, v]) => (
              <span key={k}>
                <strong>{k}:</strong> {String(v)}
              </span>
            ))}
          </li>
        ))}
      </ul>
    );

  // Array of primitives
  if (Array.isArray(parsed))
    return (
      <ul className="space-y-1 list-disc list-inside">
        {parsed.map((v, i) => (
          <li key={i}>{String(v)}</li>
        ))}
      </ul>
    );

  // Otherwise plain text
  return <div className="text-sm">{String(parsed)}</div>;
}

function EditableTextCell<T extends object>(
  props: CellContext<T, string | null>,
) {
  const { t } = useTranslation('translation', { keyPrefix: 'workspace.cfp' });
  const { getValue, row, column, table } = props;
  const value = getValue() ?? '';
  const [temp, setTemp] = useState(value);

  const handleBlur = () =>
    table.options.meta?.updateData(row.index, column.id as keyof T, temp);

  return (
    <Textarea
      className="h-10 resize-none text-xs"
      value={temp}
      onChange={(e) => setTemp(e.target.value)}
      onBlur={handleBlur}
      placeholder={t('feedback.textareaPlaceholder')}
    />
  );
}

function EditableCheckboxCell<T extends object>(
  props: CellContext<T, boolean | null>,
) {
  const { getValue, row, column, table } = props;
  const value = getValue() ?? false;
  return (
    <Checkbox
      checked={value}
      className="size-5 mx-auto"
      onCheckedChange={(checked) =>
        table.options.meta?.updateData(
          row.index,
          column.id as keyof T,
          !!checked,
        )
      }
    />
  );
}

type FeedbackEditTableProps = { feedback: FeedbackSummary };

export function FeedbackEditTable({ feedback }: FeedbackEditTableProps) {
  const { t } = useTranslation('translation', { keyPrefix: 'workspace.cfp' });
  const queryClient = useQueryClient();

  const [data, setData] = useState<Array<FeedbackSummaryItem>>(feedback.items);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const queryKey = cfpFeedbackKeys.detail(feedback.cfpAnalysis.id.toString());

  // Optimistic update mutation
  const updateMutation = useMutation({
    mutationFn: async (updatedFeedback: FeedbackSummary) =>
      updateUserFeedbackApi(
        feedback.cfpAnalysis.id.toString(),
        feedback.id.toString(),
        updatedFeedback,
      ),

    // Optimistic update before mutation
    onMutate: async (updatedFeedback) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<FeedbackSummary>(queryKey);
      queryClient.setQueryData<FeedbackSummary>(queryKey, updatedFeedback);
      return { previous };
    },

    // On error, roll back to previous
    onError: (_err, _newData, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      setData(feedback.items);
      toast.error(t('feedback.updateError'));
    },

    // On success, ensure cache matches latest server response
    // eslint-disable-next-line no-shadow
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const handleUpdate = (
    rowIndex: number,
    columnId: keyof FeedbackSummaryItem,
    value: unknown,
  ) => {
    const updatedItems = data.map((row, i) =>
      i === rowIndex ? { ...row, [columnId]: value } : row,
    );
    const nextFeedback = { ...feedback, items: updatedItems };

    // Update local state immediately
    setData(updatedItems);

    // Trigger mutation to update server and sync cache
    updateMutation.mutate(nextFeedback);
  };

  const columns = useMemo<Array<ColumnDef<FeedbackSummaryItem>>>(
    () => [
      {
        accessorKey: 'name',
        header: t('columns.name'),
        cell: (ctx) => (
          <NameCell {...(ctx as CellContext<FeedbackSummaryItem, string>)} />
        ),
        size: 150,
      },
      {
        accessorKey: 'value',
        header: t('columns.value'),
        cell: (ctx) => (
          <ReadonlyTextCell<FeedbackSummaryItem>
            {...(ctx as CellContext<FeedbackSummaryItem, string>)}
          />
        ),
        size: 180,
      },
      {
        accessorKey: 'evidence',
        header: t('columns.evidence'),
        cell: (ctx) => (
          <ReadonlyTextCell<FeedbackSummaryItem>
            {...(ctx as CellContext<FeedbackSummaryItem, string>)}
          />
        ),
        size: 180,
      },
      {
        accessorKey: 'correct',
        header: t('columns.correct'),
        cell: (ctx) => (
          <EditableCheckboxCell<FeedbackSummaryItem>
            {...(ctx as CellContext<FeedbackSummaryItem, boolean | null>)}
          />
        ),
        size: 120,
      },
      {
        accessorKey: 'comment',
        header: t('columns.comment'),
        cell: (ctx) => (
          <EditableTextCell<FeedbackSummaryItem>
            {...(ctx as CellContext<FeedbackSummaryItem, string | null>)}
          />
        ),
        size: 300,
      },
    ],
    [t],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    meta: { updateData: handleUpdate },
    state: { columnVisibility },
  });

  return (
    <>
      <InfoAlert />

      {/* Column visibility control */}
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Columns3Icon className="-ms-1 opacity-60" size={16} />
              {t('view')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('toggleColumns')}</DropdownMenuLabel>
            {table
              .getAllColumns()
              .filter((col) => col.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  checked={column.getIsVisible()}
                  onCheckedChange={(v) => column.toggleVisibility(!!v)}
                  onSelect={(e) => e.preventDefault()}
                >
                  {t(`columns.${column.id}`)}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Editable Table */}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableHead
                  key={h.id}
                  style={{ width: h.column.getSize() }}
                  className={cn('p-1.5', {
                    'text-center': h.column.id === 'correct',
                  })}
                >
                  {h.isPlaceholder
                    ? null
                    : flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {data.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="p-1.5">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center h-24">
                {t('feedback.noItems')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}

function InfoAlert() {
  const { t } = useTranslation('translation', {
    keyPrefix: 'workspace.cfp.feedback.info',
  });

  return (
    <div className="bg-sidebar/5 border border-sidebar/25 rounded-md px-4 py-3 text-foreground">
      <div className="flex gap-2 md:items-center">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15"
          aria-hidden="true"
        >
          <CircleAlert className="text-primary" size={16} strokeWidth={3} />
        </div>

        <div className="space-y-1">
          <p className="text-sm font-semibold text-primary">{t('title')}</p>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {t('description')}
          </p>
        </div>
      </div>
    </div>
  );
}
