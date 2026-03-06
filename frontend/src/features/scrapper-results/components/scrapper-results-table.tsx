/* eslint-disable no-shadow */
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  Check,
  ChevronDownIcon,
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CircleAlertIcon,
  CircleXIcon,
  Columns3Icon,
  EllipsisIcon,
  Eye,
  FilterIcon,
  ListFilterIcon,
  TrashIcon,
  X,
} from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import type {
  ColumnDef,
  Row,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';

import type {
  ScrapperResult,
  ScrapperResultStatus,
  ScrapperResultsParams,
} from '@/features/scrapper-results/lib/types';
import { getScrapperResultsQueryOptions } from '@/features/scrapper-results/lib/query-options';
import { SCRAPPER_RESULT_STATUS_OPTIONS } from '@/features/scrapper-results/lib/constants';
import { useDebounce } from '@/hooks/use-debounce';
import { DEFAULT_PAGINATION_SIZES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Route } from '@/routes/(workspace)/__workspace.scrapper-results.index';

import { EmptyTableState } from '@/components/empty-table-state';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '@/components/ui/pagination';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useScrapperResultMutations } from '@/features/scrapper-results/hooks/use-scrapper-results-mutations';

export function ScrapperResultsTable() {
  const { t } = useTranslation('translation', { keyPrefix: 'scrapperResults' });
  const id = useId();
  const {
    classifyMutation,
    rejectMutation,
    deleteMutation,
    classifyMany,
    rejectMany,
    deleteMany,
  } = useScrapperResultMutations();

  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // Search Logic
  const [searchTerm, setSearchTerm] = useState(search.q || '');
  const debouncedSearchTerm = useDebounce(searchTerm);

  useEffect(() => {
    const hasChanged = debouncedSearchTerm !== (search.q || '');
    if (hasChanged) {
      navigate({
        search: (prev) => ({
          ...prev,
          q: debouncedSearchTerm || undefined,
          page: 0,
        }),
        replace: true,
      });
    }
  }, [debouncedSearchTerm, search.q, navigate]);

  // Map URL params to API params
  const apiParams: ScrapperResultsParams = useMemo(() => {
    const params: ScrapperResultsParams = {
      page: search.page,
      size: search.size,
      sort: search.sort,
    };

    const filters: Array<string> = [];
    const rawSearch = search.q?.trim();
    if (rawSearch) {
      const escapedSearch = rawSearch.replace(/"/g, '\\"');
      filters.push(`url==*${escapedSearch}*`);
    }

    if (search.scrapperResultStatus !== 'all') {
      filters.push(`status==${search.scrapperResultStatus}`);
    }

    if (filters.length > 0) {
      params.search = filters.join(';');
    }

    return params;
  }, [search]);

  const { data: apiData, isLoading } = useQuery(
    getScrapperResultsQueryOptions(apiParams),
  );
  const rows = apiData?.content || [];
  const page = apiData?.page;

  const columns = useMemo<Array<ColumnDef<ScrapperResult>>>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label={t('columns.selectAll')}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={t('columns.selectRow')}
          />
        ),
        enableHiding: false,
        size: 28,
      },
      {
        accessorKey: 'url',
        header: t('columns.url'),
        cell: ({ getValue }) => {
          const val = getValue() as string;
          return (
            <a
              href={val}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline truncate block max-w-xs"
            >
              {val}
            </a>
          );
        },
        enableSorting: true,
      },
      {
        accessorKey: 'status',
        header: t('columns.status'),
        cell: ({ getValue }) => {
          const status = getValue() as ScrapperResultStatus;
          return (
            <Badge variant="outline" className="gap-1.5">
              <span
                className={cn('size-1.5 rounded-full', {
                  'bg-success':
                    status === 'CLASSIFIED_AUTO' ||
                    status === 'CLASSIFIED_MANUALLY',
                  'bg-yellow-500': status === 'NEW',
                  'bg-destructive':
                    status === 'FAILED' || status === 'REJECTED',
                })}
              />
              {t(`status.${status}`)}
            </Badge>
          );
        },
        size: 100,
        enableSorting: true,
      },
      {
        accessorKey: 'timestamp',
        header: t('columns.timestamp'),
        cell: ({ getValue }) => {
          const dateStr: string | undefined = getValue() as string | undefined;
          if (!dateStr) return '';
          const timestamp = new Date(dateStr);
          const formattedDate = timestamp.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
          });

          return (
            <div className="text-sm">
              <div className="font-medium">{formattedDate}</div>
            </div>
          );
        },
        size: 100,
        enableSorting: true,
      },
      {
        accessorKey: 'content',
        header: t('columns.content'),
        cell: ({ getValue }) => {
          const content = getValue() as string | undefined;
          return (
            <div className="text-sm text-muted-foreground line-clamp-3">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkBreaks]}
                rehypePlugins={[rehypeRaw, rehypeSanitize]}
                components={{
                  a: ({ ...props }) => (
                    <span className="text-muted-foreground cursor-default">
                      {props.children}
                    </span>
                  ),
                }}
              >
                {content ? content.slice(0, 250) + '...' : ''}
              </ReactMarkdown>
            </div>
          );
        },
        enableSorting: false,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('columns.actions')}</span>,
        cell: ({ row }) => (
          <RowActions
            row={row}
            handleDelete={handleDeleteSingle}
            handleReject={handleRejectSingle}
            handleClassify={handleClassifySingle}
          />
        ),
        enableHiding: false,
        size: 60,
      },
    ],
    [t],
  );

  const sorting = useMemo<SortingState>(() => {
    if (!search.sort) return [];
    const [id, order] = search.sort.split(',');
    return [{ id, desc: order === 'desc' }];
  }, [search.sort]);

  const table = useReactTable({
    data: rows,
    columns,
    manualSorting: true,
    manualPagination: true,
    pageCount: page?.totalPages ?? 0,
    state: {
      pagination: { pageIndex: search.page, pageSize: search.size },
      sorting,
      columnVisibility,
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      const sortStr = next.length
        ? `${next[0].id},${next[0].desc ? 'desc' : 'asc'}`
        : undefined;
      navigate({
        search: (prev) => ({ ...prev, sort: sortStr, page: 0 }),
        replace: true,
      });
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater({ pageIndex: search.page, pageSize: search.size })
          : updater;
      navigate({
        search: (prev) => ({
          ...prev,
          page: next.pageIndex,
          size: next.pageSize,
        }),
        replace: true,
      });
    },
    getCoreRowModel: getCoreRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
  });

  const handleDeleteSingle = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleDeleteSelected = async () => {
    const ids = table.getSelectedRowModel().rows.map((r) => r.original.id);
    await deleteMany(ids);
  };

  const handleClassifySingle = (id: number) => {
    classifyMutation.mutate(id);
  };

  const handleClassifySelected = async () => {
    const ids = table.getSelectedRowModel().rows.map((r) => r.original.id);
    await classifyMany(ids);
  };

  const handleRejectSingle = (id: number) => {
    rejectMutation.mutate(id);
  };

  const handleRejectSelected = async () => {
    const ids = table.getSelectedRowModel().rows.map((r) => r.original.id);
    await rejectMany(ids);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Input
              id={`${id}-search`}
              className={cn(
                'peer min-w-60 ps-9',
                Boolean(searchTerm) && 'pe-9',
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('filters.searchPlaceholder')}
              type="text"
            />
            <div className="text-muted-foreground/80 absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
              <ListFilterIcon size={16} />
            </div>
            {Boolean(searchTerm) && (
              <button
                type="button"
                className="text-muted-foreground/80 hover:text-foreground absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center"
                onClick={() => setSearchTerm('')}
              >
                <CircleXIcon size={16} />
              </button>
            )}
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <FilterIcon className="-ms-1 opacity-60" size={16} />
                {t('filters.status')}
                {search.scrapperResultStatus !== 'all' && (
                  <span className="bg-background text-muted-foreground/70 -me-1 inline-flex items-center rounded border px-1 text-[0.625rem] font-medium">
                    {t(`status.${search.scrapperResultStatus}`)}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto min-w-48 p-3" align="start">
              <div className="space-y-3">
                <div className="text-muted-foreground text-xs font-medium">
                  {t('filters.statusDescription')}
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {SCRAPPER_RESULT_STATUS_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`${id}-${opt.value}`}
                        checked={search.scrapperResultStatus === opt.value}
                        onCheckedChange={(checked: boolean) =>
                          navigate({
                            search: (prev) => ({
                              ...prev,
                              scrapperResultStatus: checked ? opt.value : 'all',
                              page: 0,
                            }),
                            replace: true,
                          })
                        }
                      />
                      <Label
                        htmlFor={`${id}-${opt.value}`}
                        className="flex grow justify-between gap-2 font-normal text-sm"
                      >
                        {t(`status.${opt.value}`)}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-3">
          {table.getSelectedRowModel().rows.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <TrashIcon className="-ms-1 opacity-60" size={16} />
                  {t('actions.delete')}
                  <span className="bg-background text-muted-foreground/70 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 text-[0.625rem] font-medium">
                    {table.getSelectedRowModel().rows.length}
                  </span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <div className="flex gap-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full border">
                    <CircleAlertIcon size={16} />
                  </div>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t('dialogs.delete.title')}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('dialogs.delete.description', {
                        count: table.getSelectedRowModel().rows.length,
                      })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSelected}>
                    {t('actions.delete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {table.getSelectedRowModel().rows.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <Check className="-ms-1 opacity-60" size={16} />
                  {t('actions.classify')}
                  <span className="bg-background text-muted-foreground/70 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 text-[0.625rem] font-medium">
                    {table.getSelectedRowModel().rows.length}
                  </span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <div className="flex gap-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full border">
                    <Check size={16} />
                  </div>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t('dialogs.classify.title')}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('dialogs.classify.description', {
                        count: table.getSelectedRowModel().rows.length,
                      })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClassifySelected}>
                    {t('actions.classify')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {table.getSelectedRowModel().rows.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <X className="-ms-1 opacity-60" size={16} />
                  {t('actions.reject')}
                  <span className="bg-background text-muted-foreground/70 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 text-[0.625rem] font-medium">
                    {table.getSelectedRowModel().rows.length}
                  </span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <div className="flex gap-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full border">
                    <X size={16} />
                  </div>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t('dialogs.reject.title')}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('dialogs.reject.description', {
                        count: table.getSelectedRowModel().rows.length,
                      })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('actions.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRejectSelected}>
                    {t('actions.reject')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

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
                .filter((c) => c.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(v) => column.toggleVisibility(!!v)}
                  >
                    {t(`columns.${column.id}`)}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="border rounded-md overflow-hidden bg-background">
        <Table className="table-fixed">
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead
                    key={h.id}
                    className={cn(
                      'h-11',
                      h.column.getCanSort() && 'cursor-pointer select-none',
                    )}
                    style={{ width: h.column.getSize() }}
                  >
                    {h.isPlaceholder ? null : h.column.getCanSort() ? (
                      <div
                        className="flex items-center justify-between gap-2"
                        onClick={h.column.getToggleSortingHandler()}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {{
                          asc: <ChevronUpIcon size={16} />,
                          desc: <ChevronDownIcon size={16} />,
                        }[h.column.getIsSorted() as string] ?? null}
                      </div>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center">
                  <Spinner className="mx-auto" />
                </TableCell>
              </TableRow>
            ) : rows.length ? (
              table.getRowModel().rows.map((r) => (
                <TableRow key={r.id}>
                  {r.getVisibleCells().map((c) => (
                    <TableCell key={c.id}>
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length}>
                  <EmptyTableState />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-8">
        <div className="flex items-center gap-3">
          <Label htmlFor={`${id}-page-size`}>
            {t('pagination.rowsPerPage')}
          </Label>
          <Select
            value={search.size.toString()}
            onValueChange={(v) =>
              navigate({
                search: (p) => ({ ...p, size: Number(v), page: 0 }),
                replace: true,
              })
            }
          >
            <SelectTrigger id={`${id}-page-size`} className="w-fit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEFAULT_PAGINATION_SIZES.map((ps) => (
                <SelectItem key={ps} value={ps.toString()}>
                  {ps}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-muted-foreground flex grow justify-end text-sm">
          <p>
            {(() => {
              const total = page?.totalElements ?? 0;
              const start = total === 0 ? 0 : search.page * search.size + 1;
              const end =
                total === 0 ? 0 : Math.min(start + rows.length - 1, total);
              return t('pagination.info', { start, end, total });
            })()}
          </p>
        </div>
        <div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => table.firstPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronFirstIcon size={16} />
                </Button>
              </PaginationItem>
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeftIcon size={16} />
                </Button>
              </PaginationItem>
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronRightIcon size={16} />
                </Button>
              </PaginationItem>
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => table.lastPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <ChevronLastIcon size={16} />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </div>
  );
}

function RowActions({
  row,
  handleDelete,
  handleReject,
  handleClassify,
}: {
  row: Row<ScrapperResult>;
  handleDelete: (id: number) => void;
  handleReject: (id: number) => void;
  handleClassify: (id: number) => void;
}) {
  const { t } = useTranslation('translation', { keyPrefix: 'scrapperResults' });
  const id = row.original.id;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex justify-end">
          <Button size="icon" variant="ghost">
            <EllipsisIcon size={16} />
          </Button>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link
              to="/scrapper-results/$id"
              params={{ id: id.toString() }}
              className="w-full"
            >
              <Eye className="mr-2 h-4 w-4" />
              {t('dropdown.view')}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => handleClassify(row.original.id)}>
            <Check className="mr-2 h-4 w-4" />
            {t('dropdown.classify')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleReject(row.original.id)}>
            <X className="mr-2 h-4 w-4" />
            {t('dropdown.reject')}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => handleDelete(row.original.id)}
          >
            <TrashIcon className="mr-2 h-4 w-4" />
            {t('dropdown.delete')}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
