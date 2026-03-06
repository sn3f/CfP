/* eslint-disable no-shadow */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ChevronDownIcon,
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CircleAlertIcon,
  CircleXIcon,
  Columns3Icon,
  EditIcon,
  EllipsisIcon,
  FileCog,
  FilterIcon,
  ListFilterIcon,
  PlusIcon,
  TrashIcon,
} from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type {
  ColumnDef,
  Row,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';

import type {
  ProcessingMode,
  Source,
  SourceFrequency,
  SourceStatus,
  SourcesParams,
} from '@/features/sources/lib/types';
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
import { SourceDrawer } from '@/features/sources/components/source-drawer';
import {
  createSourceApi,
  deleteSourceApi,
  scrapeSourceApi,
  updateSourceApi,
} from '@/features/sources/lib/api';
import {
  SOURCE_FREQUENCY_OPTIONS,
  SOURCE_STATUS_OPTIONS,
} from '@/features/sources/lib/constants';
import { getSourcesQueryOptions } from '@/features/sources/lib/query-options';
import {
  cronToFrequency,
  frequencyToCron,
  getNextExecutionDate,
} from '@/features/sources/lib/utils';
import { useDebounce } from '@/hooks/use-debounce';
import { DEFAULT_PAGINATION_SIZES } from '@/lib/constants';
import { sourcesKeys } from '@/lib/key-factory';
import { cn } from '@/lib/utils';
import { Route } from '@/routes/(workspace)/__workspace.sources';

export function SourcesTable() {
  const { t } = useTranslation('translation', { keyPrefix: 'sources' });
  const id = useId();
  const queryClient = useQueryClient();

  // Search Params Synchronization
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  // Search Term Logic
  const [searchTerm, setSearchTerm] = useState(search.q || '');
  const debouncedSearchTerm = useDebounce(searchTerm);

  // Navigate when search terms change
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

  const [isJsonValid, setIsJsonValid] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Source | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    websiteUrl: '',
    status: SOURCE_STATUS_OPTIONS[0].value,
    frequency: SOURCE_FREQUENCY_OPTIONS[0].value,
    guidelines: '',
    config: '',
    classification: 'AUTO' as ProcessingMode,
  });

  const apiParams: SourcesParams = useMemo(() => {
    const params: SourcesParams = {
      page: search.page,
      size: search.size,
      sort: search.sort,
    };

    const filters: Array<string> = [];

    const rawSearch = search.q?.trim();
    if (rawSearch) {
      const escapedSearch = rawSearch.replace(/"/g, '\\"');
      filters.push(`(name==*${escapedSearch}*,websiteUrl==*${escapedSearch}*)`);
    }

    if (search.sourceStatus !== 'all') {
      filters.push(`sourceStatus==${search.sourceStatus}`);
    }

    if (filters.length > 0) {
      params.search = filters.join(';');
    }

    return params;
  }, [search]);

  const { data: apiData, isLoading } = useQuery(
    getSourcesQueryOptions(apiParams),
  );
  const rows = apiData?.content ?? [];
  const page = apiData?.page;

  const invalidateAll = () =>
    queryClient.invalidateQueries({ queryKey: sourcesKeys.all });

  const createMutation = useMutation({
    mutationFn: createSourceApi,
    onSuccess: () => {
      invalidateAll();
      toast.success(t('toasts.addSuccess'));
    },
    onError: () => {
      toast.error(t('toasts.addError'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Partial<Source>) =>
      updateSourceApi(id, body),
    onSuccess: () => {
      invalidateAll();
      toast.success(t('toasts.updateSuccess'));
    },
    onError: () => {
      toast.error(t('toasts.updateError'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSourceApi(id),
    onSuccess: () => {
      invalidateAll();
      toast.success(t('toasts.deleteSuccess'));
    },
    onError: () => {
      toast.error(t('toasts.deleteError'));
    },
  });

  const scrappingMutation = useMutation({
    mutationFn: (id: number) => scrapeSourceApi(id),
    onSuccess: () => {
      toast.success(t('toasts.scrappingSuccess'));
    },
    onError: () => {
      toast.error(t('toasts.scrappingError'));
    },
  });

  const columns = useMemo<Array<ColumnDef<Source>>>(
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
        size: 28,
        enableHiding: false,
      },
      {
        accessorKey: 'name',
        header: t('columns.name'),
        cell: ({ getValue }) => (
          <div
            className="font-medium truncate max-w-xs"
            title={getValue() as string}
          >
            {getValue() as string}
          </div>
        ),
        enableHiding: false,
      },
      {
        accessorKey: 'websiteUrl',
        header: t('columns.websiteUrl'),
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
      },
      {
        accessorKey: 'status',
        header: t('columns.status'),
        cell: ({ getValue }) => {
          const status = getValue() as SourceStatus;
          return (
            <Badge variant="outline" className="gap-1.5">
              <span
                className={cn('size-1.5 rounded-full', {
                  'bg-destructive': status === 'INACTIVE',
                  'bg-success': status === 'ACTIVE',
                })}
              ></span>
              {t(`status.${status}`)}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'frequency',
        header: t('columns.frequency'),
        cell: ({ getValue }) => {
          const frequency = getValue() as SourceFrequency | string;
          const displayFrequency = frequency.includes('*')
            ? cronToFrequency(frequency)
            : (frequency as SourceFrequency);
          return (
            <Badge variant="secondary">
              {t(`frequency.${displayFrequency}`)}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'nextExecution',
        header: t('columns.nextExecution'),
        cell: ({ row }) => {
          const frequency = row.original.frequency;
          const nextExecution = getNextExecutionDate(frequency);

          if (!nextExecution || row.original.status !== 'ACTIVE') {
            return <span className="text-muted-foreground">—</span>;
          }

          const formattedDate = nextExecution.toLocaleDateString('en-US', {
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
        enableSorting: false,
      },
      {
        accessorKey: 'guidelines',
        header: t('columns.guidelines'),
        cell: ({ getValue }) =>
          getValue() ? (
            <div className="truncate max-w-xs" title={getValue() as string}>
              {getValue() as string}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('columns.actions')}</span>,
        cell: ({ row }) => (
          <RowActions
            row={row}
            handleEdit={handleEdit}
            handleDelete={handleDeleteSingle}
            handleScrapping={handleScrapping}
          />
        ),
        size: 60,
        enableHiding: false,
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
    await Promise.all(ids.map((id) => deleteMutation.mutateAsync(id)));
    invalidateAll();
  };

  const handleAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      websiteUrl: '',
      status: SOURCE_STATUS_OPTIONS[0].value,
      frequency: SOURCE_FREQUENCY_OPTIONS[0].value,
      guidelines: '',
      config: '',
      classification: 'AUTO' as ProcessingMode,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (source: Source) => {
    setEditingItem(source);
    const displayFrequency = source.frequency.includes('*')
      ? cronToFrequency(source.frequency)
      : (source.frequency as SourceFrequency);

    setFormData({
      name: source.name,
      websiteUrl: source.websiteUrl,
      status: source.status,
      frequency: displayFrequency,
      guidelines: source.guidelines ?? '',
      classification: source.classification,
      config: JSON.stringify(source.config ?? {}, null, 2),
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.websiteUrl.trim()) return;

    let parsedConfig;

    try {
      parsedConfig = formData.config ? JSON.parse(formData.config) : {};
    } catch (err) {
      toast.error('Invalid JSON in config field.');
      return;
    }

    const cronFrequency = frequencyToCron(formData.frequency);

    const apiData = {
      ...formData,
      frequency: cronFrequency,
      config: parsedConfig,
    };

    if (editingItem)
      await updateMutation.mutateAsync({
        id: editingItem.id,
        ...apiData,
      });
    else await createMutation.mutateAsync(apiData);
    setIsDialogOpen(false);
  };

  function handleScrapping(sourceId: number) {
    if (!sourceId) return;
    scrappingMutation.mutate(sourceId);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      {/* Filters + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Search */}
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
              aria-label={t('filters.searchPlaceholder')}
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

          {/* Status Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <FilterIcon className="-ms-1 opacity-60" size={16} />
                {t('filters.status')}
                {search.sourceStatus !== 'all' && (
                  <span className="bg-background text-muted-foreground/70 -me-1 inline-flex items-center rounded border px-1 text-[0.625rem] font-medium">
                    {t(`status.${search.sourceStatus}`)}
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
                  {SOURCE_STATUS_OPTIONS.map((opt) => (
                    <div key={opt.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`${id}-${opt.value}`}
                        checked={search.sourceStatus === opt.value}
                        onCheckedChange={(checked: boolean) =>
                          navigate({
                            search: (prev) => ({
                              ...prev,
                              sourceStatus: checked ? opt.value : 'all',
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

        {/* Actions */}
        <div className="flex items-center gap-3">
          {table.getSelectedRowModel().rows.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="ml-auto bg-transparent" variant="outline">
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
                    {t('actions.confirmDelete')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {/* Columns */}
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
          <Button
            className="ml-auto bg-transparent"
            variant="outline"
            onClick={handleAdd}
          >
            <PlusIcon className="-ms-1 opacity-60" size={16} />
            {t('actions.addSource')}
          </Button>
        </div>
      </div>

      <SourceDrawer
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        formData={formData}
        setFormData={setFormData}
        isJsonValid={isJsonValid}
        setIsJsonValid={setIsJsonValid}
        editingItem={editingItem}
        handleSave={handleSave}
        handleScrapping={handleScrapping}
      />

      {/* Table */}
      <div className="border rounded-md overflow-hidden bg-background">
        <Table className="table-fixed">
          <TableHeader>
            {table.getHeaderGroups().map((g) => (
              <TableRow key={g.id}>
                {g.headers.map((h) => (
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
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((r) => (
                <TableRow key={r.id}>
                  {r.getVisibleCells().map((c) => (
                    <TableCell key={c.id} style={{ width: c.column.getSize() }}>
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

      {/* Pagination */}
      <div className="flex items-center justify-between gap-8">
        <div className="flex items-center gap-3">
          <Label htmlFor={`${id}-page-size`} className="max-sm:sr-only">
            {t('pagination.rowsPerPage')}
          </Label>
          <Select
            value={search.size.toString()}
            onValueChange={(v) =>
              navigate({
                search: (prev) => ({ ...prev, size: Number(v), page: 0 }),
                replace: true,
              })
            }
          >
            <SelectTrigger
              id={`${id}-page-size`}
              className="w-fit whitespace-nowrap"
            >
              <SelectValue placeholder={t('pagination.selectRows')} />
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
          <p aria-live="polite">
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
  handleEdit,
  handleDelete,
  handleScrapping,
}: {
  row: Row<Source>;
  handleEdit: (source: Source) => void;
  handleDelete: (id: number) => void;
  handleScrapping: (id: number) => void;
}) {
  const { t } = useTranslation('translation', { keyPrefix: 'sources' });
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
          <DropdownMenuItem onClick={() => handleEdit(row.original)}>
            <EditIcon className="mr-2 h-4 w-4" />
            {t('dropdown.edit')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleScrapping(row.original.id)}>
            <FileCog className="mr-2 h-4 w-4" />
            {t('dropdown.scrape')}
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
