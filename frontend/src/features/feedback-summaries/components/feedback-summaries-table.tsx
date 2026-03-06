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
  EllipsisIcon,
  Eye,
  ListFilterIcon,
  TrashIcon,
  User2,
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
  AdminFeedbackOwner,
  AdminFeedbackSummariesParams,
  AdminFeedbackSummary,
} from '@/features/feedback-summaries/lib/types';
import type { CfpAnalysis, FeedbackSummaryItem } from '@/lib/types';
import { getFeedbackSummariesQueryOptions } from '@/features/feedback-summaries/lib/query-options';
import { useDebounce } from '@/hooks/use-debounce';
import { DEFAULT_PAGINATION_SIZES } from '@/lib/constants';
import { deleteFeedbackSummaryApi } from '@/features/feedback-summaries/lib/api';
import { cn } from '@/lib/utils';

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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import {
  cfpAnalysesKeys,
  cfpFeedbackKeys,
  feedbackSummariesKeys,
} from '@/lib/key-factory';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Route } from '@/routes/(workspace)/__workspace.feedback-summaries';

export function FeedbackSummariesTable() {
  const { t } = useTranslation('translation', {
    keyPrefix: 'feedbackSummaries',
  });
  const id = useId();
  const queryClient = useQueryClient();

  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

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

  const isMobile = useIsMobile();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [viewedItem, setViewedItem] = useState<AdminFeedbackSummary | null>(
    null,
  );

  const apiParams: AdminFeedbackSummariesParams = useMemo(() => {
    const params: AdminFeedbackSummariesParams = {
      page: search.page,
      size: search.size,
      sort: search.sort,
    };

    const filters: Array<string> = [];
    const rawSearch = search.q?.trim();
    if (rawSearch) {
      const escapedSearch = rawSearch.replace(/"/g, '\\"');
      filters.push(
        `(cfpAnalysis.extractedData.json.title==*${escapedSearch}*)`,
      );
    }

    if (filters.length > 0) {
      params.search = filters.join(';');
    }

    return params;
  }, [search]);

  const { data: apiData, isLoading } = useQuery({
    ...getFeedbackSummariesQueryOptions(apiParams),
    staleTime: 0,
  });
  const rows = apiData?.content ?? [];
  const page = apiData?.page;

  const invalidateAll = async () =>
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: feedbackSummariesKeys.all,
        refetchType: 'all',
      }),
      queryClient.invalidateQueries({
        queryKey: cfpFeedbackKeys.all,
        refetchType: 'all',
      }),
      queryClient.invalidateQueries({
        queryKey: cfpAnalysesKeys.all,
        refetchType: 'all',
      }),
    ]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteFeedbackSummaryApi(id),
    onSuccess: () => {
      invalidateAll();
      toast.success(t('toasts.deleteSuccess'));
    },
    onError: () => {
      toast.error(t('toasts.deleteError'));
    },
  });

  const handleView = (item: AdminFeedbackSummary) => {
    setViewedItem(item);
    setIsDrawerOpen(true);
  };

  const columns = useMemo<Array<ColumnDef<AdminFeedbackSummary>>>(
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
        accessorKey: 'owner',
        header: t('columns.owner'),
        cell: ({ getValue }) => {
          const user = getValue() as AdminFeedbackOwner;
          return <Owner owner={user} />;
        },
        size: 160,
        enableSorting: true,
      },
      {
        accessorKey: 'cfpAnalysis',
        header: t('columns.cfpAnalysis'),
        cell: ({ getValue }) => {
          const cfp = getValue() as CfpAnalysis;
          return <span className="font-medium">{cfp.extractedData.title}</span>;
        },
        size: 240,
        enableSorting: false,
      },
      {
        accessorKey: 'createdAt',
        header: t('columns.createdAt'),
        cell: ({ getValue }) => {
          const raw = getValue() as string;
          const date = raw
            ? new Date(raw).toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '—';
          return <span>{date}</span>;
        },
        size: 150,
        enableSorting: true,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('columns.actions')}</span>,
        cell: ({ row }) => (
          <RowActions
            row={row}
            handleDelete={handleDeleteSingle}
            handleView={handleView}
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
    await Promise.all(ids.map((id) => deleteMutation.mutateAsync(id)));
    invalidateAll();
  };

  return (
    <div className="space-y-4">
      {/* Drawer */}
      <Drawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        direction={isMobile ? 'bottom' : 'right'}
        dismissible={false}
      >
        <DrawerContent className="data-[vaul-drawer-direction=right]:sm:max-w-lg">
          <DrawerHeader>
            <DrawerTitle>{t('drawer.title')}</DrawerTitle>
            <DrawerDescription>{t('drawer.description')}</DrawerDescription>
          </DrawerHeader>

          <div className="p-4 overflow-y-auto max-h-[calc(100vh-12rem)] space-y-4">
            {viewedItem ? (
              <>
                <div className="flex flex-row gap-2 items-center justify-between text-sm">
                  <Owner owner={viewedItem.owner} />
                  {new Date(viewedItem.createdAt).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <Separator />
                <CfP cfp={viewedItem.cfpAnalysis} />
                <Separator />
                <SummaryTable items={viewedItem.items} />
              </>
            ) : (
              <Spinner className="mx-auto" />
            )}
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button
                variant="default"
                className="w-full"
                onClick={() => setIsDrawerOpen(false)}
              >
                {t('actions.close')}
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

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
        </div>

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
              <TableRow key={hg.id} className="hover:bg-transparent">
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
              const end = Math.min(start + rows.length - 1, total);
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
  handleView,
  handleDelete,
}: {
  row: Row<AdminFeedbackSummary>;
  handleView: (item: AdminFeedbackSummary) => void;
  handleDelete: (id: number) => void;
}) {
  const { t } = useTranslation('translation', {
    keyPrefix: 'feedbackSummaries',
  });
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
          <DropdownMenuItem onClick={() => handleView(row.original)}>
            <Eye className="mr-2 size-4" />
            {t('dropdown.open')}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => handleDelete(row.original.id)}
          >
            <TrashIcon className="mr-2 size-4" />
            {t('dropdown.delete')}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Owner({ owner }: { owner: AdminFeedbackOwner }) {
  return (
    <div className="flex flex-row gap-2 items-center">
      <Avatar>
        <AvatarFallback>
          <User2 className="size-4" />
        </AvatarFallback>
      </Avatar>
      <div className="truncate">
        <p className="text-sm font-medium">{owner.name}</p>
        <p className="text-xs text-muted-foreground">{owner.email}</p>
      </div>
    </div>
  );
}

function CfP({ cfp }: { cfp: CfpAnalysis }) {
  return (
    <>
      <h3 className="text-md font-semibold my-0 text-pretty">
        {cfp.extractedData.title}
      </h3>
      <a
        href={cfp.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-medium text-primary underline hover:text-primary/80 hover:no-underline cursor-pointer line-clamp-2"
      >
        {cfp.url}
      </a>
    </>
  );
}

function SummaryTable({ items }: { items: Array<FeedbackSummaryItem> }) {
  const { t } = useTranslation('translation', {
    keyPrefix: 'feedbackSummaries',
  });
  const columns = useMemo<Array<ColumnDef<FeedbackSummaryItem>>>(
    () => [
      {
        accessorKey: 'name',
        header: t('columns.name'),
        cell: ({ getValue }) => {
          const name = getValue() as string;
          return <span className="text-xs break-words">{name}</span>;
        },
        size: 120,
      },
      {
        accessorKey: 'correct',
        header: t('columns.correct'),
        cell: ({ getValue }) => {
          const val = getValue() as boolean | null;
          const isCorrect = val === true;
          const color = isCorrect ? 'bg-success' : 'bg-destructive';
          const label = isCorrect ? t('values.yes') : t('values.no');
          return (
            <Badge
              variant="outline"
              className="gap-1.5 border-border/70 text-xs font-normal"
            >
              <span className={cn('size-1.5 rounded-full', color)} />
              {label}
            </Badge>
          );
        },
        size: 80,
      },
      {
        accessorKey: 'comment',
        header: t('columns.comment'),
        cell: ({ getValue }) => {
          const comment = getValue() as string;
          return comment ? (
            <p className="text-xs text-muted-foreground break-words">
              {comment}
            </p>
          ) : (
            <span>—</span>
          );
        },
      },
    ],
    [t],
  );
  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              return (
                <TableHead
                  key={header.id}
                  style={{ width: header.column.getSize() }}
                  className="px-2 text-sm"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.length ? (
          table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  style={{ width: cell.column.getSize() }}
                  className="p-2"
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="text-center py-6 text-muted-foreground text-sm"
            >
              {t('noFeedbackItems')}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
