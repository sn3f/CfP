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
  CircleAlert,
  CircleAlertIcon,
  CircleXIcon,
  Columns3Icon,
  EditIcon,
  EllipsisIcon,
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

import type { CriterionTypesParams } from '@/features/criterion-types/lib/types';
import type { CriterionType } from '@/lib/types';
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
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from '@/components/ui/field';
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
import { Textarea } from '@/components/ui/textarea';
import {
  createCriterionTypeApi,
  deleteCriterionTypeApi,
  updateCriterionTypeApi,
} from '@/features/criterion-types/lib/api';
import { getCriterionTypesQueryOptions } from '@/features/criterion-types/lib/query-options';
import { useDebounce } from '@/hooks/use-debounce';
import { useIsMobile } from '@/hooks/use-mobile';
import { DEFAULT_PAGINATION_SIZES } from '@/lib/constants';
import { criterionTypesKeys } from '@/lib/key-factory';
import { cn } from '@/lib/utils';
import { Route } from '@/routes/(workspace)/__workspace.criterion-types';

export function CriterionTypesTable() {
  const { t } = useTranslation('translation', { keyPrefix: 'criterionTypes' });
  const id = useId();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const [searchTerm, setSearchTerm] = useState(search.q || '');
  const debouncedSearchTerm = useDebounce(searchTerm);

  useEffect(() => {
    setSearchTerm(search.q || '');
  }, [search.q]);

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

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CriterionType | null>(null);
  const [formData, setFormData] = useState({
    fieldName: '',
    evaluationLogic: '',
    examples: '',
    hard: false,
  });

  const apiParams: CriterionTypesParams = useMemo(() => {
    const params: CriterionTypesParams = {
      page: search.page,
      size: search.size,
      sort: search.sort,
    };

    const filters: Array<string> = [];
    const rawSearch = search.q?.trim();
    if (rawSearch) {
      const encodedSearch = encodeURIComponent(rawSearch.replace(/"/g, '\\"'));

      filters.push(
        `(fieldName==*${encodedSearch}*,examples==*${encodedSearch}*)`,
      );
    }

    if (search.hard !== undefined) {
      filters.push(`hard==${search.hard}`);
    }

    if (filters.length > 0) {
      params.search = filters.join(';');
    }

    return params;
  }, [search]);

  const { data: apiData, isLoading } = useQuery(
    getCriterionTypesQueryOptions(apiParams),
  );
  const rows = apiData?.content ?? [];
  const page = apiData?.page;

  const invalidateAll = () =>
    queryClient.invalidateQueries({ queryKey: criterionTypesKeys.all });

  const createMutation = useMutation({
    mutationFn: createCriterionTypeApi,
    onSuccess: () => {
      invalidateAll();
      toast.success(t('toasts.addSuccess'));
    },
    onError: () => {
      toast.error(t('toasts.addError'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: number } & Partial<CriterionType>) =>
      updateCriterionTypeApi(id, body),
    onSuccess: () => {
      invalidateAll();
      toast.success(t('toasts.updateSuccess'));
    },
    onError: () => {
      toast.error(t('toasts.updateError'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCriterionTypeApi(id),
    onSuccess: () => {
      invalidateAll();
      toast.success(t('toasts.deleteSuccess'));
    },
    onError: () => {
      toast.error(t('toasts.deleteError'));
    },
  });

  const columns = useMemo<Array<ColumnDef<CriterionType>>>(
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
        accessorKey: 'fieldName',
        header: t('columns.fieldName'),
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
        accessorKey: 'evaluationLogic',
        header: t('columns.evaluationLogic'),
        cell: ({ getValue }) => {
          const val = getValue() as string | null;
          return (
            <div className="max-w-xs line-clamp-3" title={val ?? ''}>
              {val || <span className="text-muted-foreground">—</span>}
            </div>
          );
        },
      },
      {
        accessorKey: 'examples',
        header: t('columns.examples'),
        cell: ({ getValue }) => {
          const val = getValue() as string;
          return val ? (
            <div className="max-w-xs line-clamp-3" title={val}>
              {val}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          );
        },
      },
      {
        accessorKey: 'hard',
        header: t('columns.hard'),
        cell: ({ getValue }) => {
          const val = getValue() as boolean | null;
          return (
            <Badge variant="outline" className="gap-1.5">
              <span
                className={cn('size-1.5 rounded-full', {
                  'bg-destructive': !val,
                  'bg-success': val,
                })}
              ></span>
              {val ? t('hard.true') : t('hard.false')}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('columns.actions')}</span>,
        cell: ({ row }) => (
          <RowActions
            row={row}
            handleEdit={handleEdit}
            handleDelete={handleSingleDelete}
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

  const handleSingleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleDeleteSelected = async () => {
    const selectedIds = table
      .getSelectedRowModel()
      .rows.map((r) => r.original.id);
    await Promise.all(selectedIds.map((id) => deleteMutation.mutateAsync(id)));
    queryClient.invalidateQueries({ queryKey: criterionTypesKeys.all });
  };

  const resetForm = () =>
    setFormData({
      fieldName: '',
      evaluationLogic: '',
      examples: '',
      hard: false,
    });

  const handleAdd = () => {
    setEditingItem(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleEdit = (item: CriterionType) => {
    setEditingItem(item);
    setFormData({
      fieldName: item.fieldName,
      evaluationLogic: item.evaluationLogic ?? '',
      examples: item.examples ?? '',
      hard: item.hard ?? false,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.fieldName.trim()) return;
    try {
      if (editingItem)
        await updateMutation.mutateAsync({ id: editingItem.id, ...formData });
      else await createMutation.mutateAsync(formData);
    } finally {
      resetForm();
      setIsDialogOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <CautionAlert />

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

          {/* Hard / Not Hard Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <FilterIcon
                  className="-ms-1 opacity-60"
                  size={16}
                  aria-hidden="true"
                />
                {t('filters.hard')}
                {search.hard !== undefined && (
                  <span className="bg-background text-muted-foreground/70 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium">
                    {search.hard ? t('filters.hardYes') : t('filters.hardNo')}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto min-w-48 p-3" align="start">
              <div className="space-y-3">
                <div className="text-muted-foreground text-xs font-medium">
                  {t('filters.hardFilterDescription')}
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`${id}-hard-true`}
                      checked={search.hard === true}
                      onCheckedChange={(checked: boolean) =>
                        navigate({
                          search: (prev) => ({
                            ...prev,
                            hard: checked ? true : undefined,
                            page: 0,
                          }),
                          replace: true,
                        })
                      }
                    />
                    <Label
                      htmlFor={`${id}-hard-true`}
                      className="text-sm font-normal"
                    >
                      {t('filters.hardYes')}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`${id}-hard-false`}
                      checked={search.hard === false}
                      onCheckedChange={(checked: boolean) =>
                        navigate({
                          search: (prev) => ({
                            ...prev,
                            hard: checked ? false : undefined,
                            page: 0,
                          }),
                          replace: true,
                        })
                      }
                    />
                    <Label
                      htmlFor={`${id}-hard-false`}
                      className="flex grow justify-between gap-2 font-normal text-sm"
                    >
                      {t('filters.hardNo')}
                    </Label>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-3">
          {/* Bulk delete */}
          {table.getSelectedRowModel().rows.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="ml-auto bg-transparent" variant="outline">
                  <TrashIcon
                    className="-ms-1 opacity-60"
                    size={16}
                    aria-hidden="true"
                  />
                  {t('actions.delete')}
                  <span className="bg-background text-muted-foreground/70 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 text-[0.625rem] font-medium">
                    {table.getSelectedRowModel().rows.length}
                  </span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full border">
                    <CircleAlertIcon className="opacity-80" size={16} />
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

          {/* Column visibility control */}
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
            <PlusIcon
              className="-ms-1 opacity-60"
              size={16}
              aria-hidden="true"
            />
            {t('actions.addCriterion')}
          </Button>
        </div>
      </div>

      {/* Drawer (Add/Edit) */}
      <Drawer
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        direction={isMobile ? 'bottom' : 'right'}
        dismissible={false}
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {editingItem
                ? t('actions.editCriterion')
                : t('actions.addNewCriterion')}
            </DrawerTitle>
            <DrawerDescription className="flex flex-col gap-2">
              {editingItem
                ? t('dialogs.form.editDescription')
                : t('dialogs.form.createDescription')}
            </DrawerDescription>
            <CautionAlert drawer />
          </DrawerHeader>

          {/* Main scrollable content area */}
          <div className="p-4 overflow-y-auto max-h-[calc(100vh-12rem)] space-y-4">
            <FieldGroup>
              <FieldSet>
                <Field>
                  <FieldLabel htmlFor="fieldName">
                    {t('dialogs.form.fieldName')}
                  </FieldLabel>
                  <Input
                    id="fieldName"
                    value={formData.fieldName}
                    onChange={(e) =>
                      setFormData({ ...formData, fieldName: e.target.value })
                    }
                    required
                  />
                  <FieldDescription>
                    {t('dialogs.form.placeholderFieldName')}
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="evaluationLogic">
                    {t('dialogs.form.evaluationLogic')}
                  </FieldLabel>
                  <Textarea
                    id="evaluationLogic"
                    rows={3}
                    className="resize-none"
                    value={formData.evaluationLogic}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        evaluationLogic: e.target.value,
                      })
                    }
                  />
                  <FieldDescription>
                    {t('dialogs.form.placeholderEvaluation')}
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="examples">
                    {t('dialogs.form.examples')}
                  </FieldLabel>
                  <Textarea
                    id="examples"
                    rows={3}
                    placeholder={t('dialogs.form.placeholderExamples')}
                    className="resize-none"
                    value={formData.examples}
                    onChange={(e) =>
                      setFormData({ ...formData, examples: e.target.value })
                    }
                  />
                </Field>

                <Field orientation="horizontal">
                  <Checkbox
                    id="hard"
                    checked={formData.hard}
                    onCheckedChange={(checked: boolean) =>
                      setFormData({ ...formData, hard: checked })
                    }
                  />
                  <FieldLabel htmlFor="hard">
                    {t('dialogs.form.hard')}
                  </FieldLabel>
                </Field>
              </FieldSet>
            </FieldGroup>
          </div>

          <DrawerFooter>
            <DrawerClose asChild>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsDialogOpen(false)}
              >
                {t('actions.cancel')}
              </Button>
            </DrawerClose>
            <Button
              onClick={handleSave}
              disabled={
                !formData.fieldName.trim() ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {editingItem
                ? t('actions.updateCriterion')
                : t('actions.saveAdd')}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

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

      {/* Pagination */}
      <div className="flex items-center justify-between gap-8">
        {/* Results per page */}
        <div className="flex items-center gap-3">
          <Label htmlFor={`${id}-page-size`} className="max-sm:sr-only">
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

        {/* Page info */}
        <div className="text-muted-foreground flex grow justify-end text-sm">
          <p aria-live="polite">
            {(() => {
              const total = page?.totalElements ?? 0;
              const start = total === 0 ? 0 : search.page * search.size + 1;
              const end = Math.min(start + rows.length - 1, total);
              return t('pagination.info', { start, end, total });
            })()}
          </p>
        </div>

        {/* Controls */}
        <div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => table.firstPage()}
                  disabled={!table.getCanPreviousPage()}
                  aria-label={t('pagination.goToFirst')}
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
                  aria-label={t('pagination.goToPrevious')}
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
                  aria-label={t('pagination.goToNext')}
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
                  aria-label={t('pagination.goToLast')}
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
}: {
  row: Row<CriterionType>;
  handleEdit: (source: CriterionType) => void;
  handleDelete: (id: number) => void;
}) {
  const { t } = useTranslation('translation', { keyPrefix: 'criterionTypes' });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex justify-end">
          <Button
            size="icon"
            variant="ghost"
            className="shadow-none"
            aria-label={t('dropdown.actions')}
          >
            <EllipsisIcon size={16} aria-hidden="true" />
          </Button>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => handleEdit(row.original)}>
            <EditIcon className="mr-2 h-4 w-4" />
            <span>{t('dropdown.edit')}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => handleDelete(row.original.id)}
          >
            <TrashIcon className="mr-2 h-4 w-4" />
            <span>{t('dropdown.delete')}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function CautionAlert({ drawer }: { drawer?: boolean }) {
  const { t } = useTranslation('translation', {
    keyPrefix: 'criterionTypes.caution',
  });

  return (
    <div className="bg-amber-500/5 border-amber-500/25 border rounded-md px-4 py-3 text-foreground">
      <div className="flex gap-2 md:items-center">
        <div
          className={cn('flex grow gap-3 md:items-center', {
            'md:items-start': !!drawer,
          })}
        >
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500/20 max-md:mt-0.5"
            aria-hidden="true"
          >
            <CircleAlert className="text-amber-500" size={16} strokeWidth={3} />
          </div>

          <div className="flex grow flex-col justify-between gap-3 md:flex-row md:items-center">
            <div className="space-y-0.5">
              <p className="text-sm font-normal text-amber-600">
                {t('title', {
                  fieldName: <b key="field-name">Field Name</b>,
                  evaluationLogic: (
                    <b key="evaluation-logic">Evaluation Logic</b>
                  ),
                })}
              </p>
              <p
                className={cn('text-sm text-muted-foreground leading-relaxed', {
                  'text-xs': !!drawer,
                })}
              >
                {t('description')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
