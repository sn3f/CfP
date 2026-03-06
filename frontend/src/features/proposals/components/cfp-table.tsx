/* eslint-disable no-shadow */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { format, isValid, parseISO } from 'date-fns';
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  CircleAlertIcon,
  CircleXIcon,
  Columns3Icon,
  FilterIcon,
  ListFilterIcon,
  PlusIcon,
  TrashIcon,
} from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { SortingState, VisibilityState } from '@tanstack/react-table';

import type { CfpAnalysesParams } from '@/features/proposals/lib/types';
import type { CfpAnalysis } from '@/lib/types.ts';
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
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDebounce } from '@/hooks/use-debounce';
import { DEFAULT_PAGINATION_SIZES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Route } from '@/routes/(workspace)/__workspace.proposals.index';

import { getColumns } from '@/features/proposals/components/cfp-columns';
import { deleteCfpAnalysisApi } from '@/features/proposals/lib/api';

import { AddCfpDrawer } from '@/features/proposals/components/add-cfp-drawer.tsx';
import { EditCfpDrawer } from '@/features/proposals/components/edit-cfp-drawer.tsx';
import { ReclassifyCfpDrawer } from '@/features/proposals/components/reclassify-cfp-drawer.tsx';
import { getCfpAnalysesQueryOptions } from '@/features/proposals/lib/query-options';
import { useIsAdmin } from '@/hooks/use-is-admin.ts';
import { cfpAnalysesKeys } from '@/lib/key-factory';

export default function CfpAnalysesTable() {
  const { t } = useTranslation('translation', { keyPrefix: 'workspace.cfp' });
  const queryClient = useQueryClient();
  const isAdmin = useIsAdmin();

  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CfpAnalysis | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);

  const [isReclassifyOpen, setIsReclassifyOpen] = useState(false);
  const [reclassifyingItem, setReclassifyingItem] =
    useState<CfpAnalysis | null>(null);

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const [searchTerm, setSearchTerm] = useState<string>(search.q || '');
  const debouncedSearchTerm = useDebounce(searchTerm);

  const [regionCountrySearch, setRegionCountrySearch] = useState<string>(
    search.region || '',
  );
  const debouncedRegionCountrySearch = useDebounce(regionCountrySearch);

  const [themeSearch, setThemeSearch] = useState<string>(search.theme || '');
  const debouncedThemeSearch = useDebounce(themeSearch);

  const [matchInput, setMatchInput] = useState<string>(
    search.match > 0 ? String(search.match) : '',
  );
  const debouncedMatchInput = useDebounce(matchInput);

  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();

  const deadlineDate = useMemo(() => {
    if (!search.deadline) return undefined;
    const date = parseISO(search.deadline);
    return isValid(date) ? date : undefined;
  }, [search.deadline]);

  useEffect(() => {
    const searchChanged = debouncedSearchTerm !== (search.q || '');
    const regionChanged =
      debouncedRegionCountrySearch !== (search.region || '');
    const themeChanged = debouncedThemeSearch !== (search.theme || '');
    const matchChanged =
      debouncedMatchInput !== (search.match > 0 ? String(search.match) : '');

    if (searchChanged || regionChanged || themeChanged || matchChanged) {
      const parsedMatch = debouncedMatchInput ? Number(debouncedMatchInput) : 0;
      const validMatch =
        !isNaN(parsedMatch) && parsedMatch >= 0 && parsedMatch <= 100
          ? parsedMatch
          : 50;

      navigate({
        search: (prev) => ({
          ...prev,
          q: debouncedSearchTerm || undefined,
          region: debouncedRegionCountrySearch || undefined,
          theme: debouncedThemeSearch || undefined,
          match: validMatch,
          page: 0,
        }),
        replace: true,
      });
    }
  }, [
    debouncedSearchTerm,
    debouncedRegionCountrySearch,
    debouncedThemeSearch,
    debouncedMatchInput,
    search.q,
    search.region,
    search.theme,
    search.match,
    navigate,
  ]);

  const apiParams: CfpAnalysesParams = useMemo(() => {
    const params: CfpAnalysesParams = {
      page: search.page,
      size: search.size,
      sort: search.sort,
    };

    const filters: Array<string> = [];

    if (search.q) {
      const escapedSearch = search.q.replace(/"/g, '\\"');
      filters.push(
        `(extractedData.json.title=="*${escapedSearch}*",extractedData.json.organization=="*${escapedSearch}*")`,
      );
    }

    if (search.region) {
      const escapedRegionCountrySearch = search.region.replace(/"/g, '\\"');
      filters.push(
        `(extractedData.json.regions=="*${escapedRegionCountrySearch}*",extractedData.json.country=="*${escapedRegionCountrySearch}*")`,
      );
    }

    if (search.theme) {
      const escapedThemeSearch = search.theme.replace(/"/g, '\\"');
      filters.push(`extractedData.json.theme=="*${escapedThemeSearch}*"`);
    }

    if (search.deadline && search.deadline !== 'none') {
      filters.push(`(deadline>=${search.deadline},deadline==null)`);
    }

    if (search.eligible !== 'all') {
      filters.push(
        `(criteria.status=="${search.eligible}";criteria.type.fieldName=="ILO Eligibility")`,
      );
    }

    if (search.match > 0) {
      const decimalMatch = search.match / 100;
      filters.push(`(match>=${decimalMatch})`);
    }

    if (filters.length > 0) {
      params.search = filters.join(';');
    }

    return params;
  }, [search]);

  const { data: apiData } = useQuery(getCfpAnalysesQueryOptions(apiParams));

  const rows = apiData?.content ?? [];
  const page = apiData?.page;

  const invalidateAll = () =>
    queryClient.invalidateQueries({ queryKey: cfpAnalysesKeys.all });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCfpAnalysisApi(id),
    onSuccess: () => {
      invalidateAll();
      toast.success(t('toasts.deleteSuccess'));
    },
    onError: () => {
      toast.error(t('toasts.deleteError'));
    },
  });

  const handleSingleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleDeleteSelected = async () => {
    const selectedIds = table
      .getSelectedRowModel()
      .rows.map((r) => r.original.id);

    await Promise.all(selectedIds.map((id) => deleteMutation.mutateAsync(id)));
    queryClient.invalidateQueries({ queryKey: cfpAnalysesKeys.all });
  };

  const handleEditClick = (item: CfpAnalysis) => {
    setEditingItem(item);
    setIsEditOpen(true);
  };

  const handleAdd = () => {
    setIsAddOpen(true);
  };

  const handleReclassify = (cfp: CfpAnalysis) => {
    setReclassifyingItem(cfp);
    setIsReclassifyOpen(true);
  };

  const columns = getColumns(
    t,
    handleSingleDelete,
    isAdmin,
    handleEditClick,
    handleReclassify,
  );

  const sorting = useMemo<SortingState>(() => {
    if (!search.sort) return [];
    const [id, order] = search.sort.split(',');
    return [{ id, desc: order === 'desc' }];
  }, [search.sort]);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater;
      const sortStr = next.length
        ? `${next[0].id},${next[0].desc ? 'desc' : 'asc'}`
        : undefined;
      navigate({
        search: (prev) => ({ ...prev, sort: sortStr }),
        replace: true,
      });
    },
    enableSortingRemoval: false,
    getPaginationRowModel: getPaginationRowModel(),
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
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      pagination: { pageIndex: search.page, pageSize: search.size },
      columnVisibility,
    },
    manualPagination: true,
    manualSorting: true,
    pageCount: page?.totalPages ?? 0,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
      </div>

      {/* Filters & Actions Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row flex-wrap gap-3 min-w-0">
          {/* Search */}
          <div className="relative flex-1 w-full sm:w-auto lg:max-w-[250px]">
            <Input
              id={`${id}-input`}
              ref={inputRef}
              className={cn('peer w-full ps-9', Boolean(searchTerm) && 'pe-9')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('searchPlaceholder')}
              aria-label={t('searchPlaceholder')}
              type="text"
            />
            <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
              <ListFilterIcon size={16} aria-hidden="true" />
            </div>
            {Boolean(searchTerm) && (
              <button
                className="text-muted-foreground/80 hover:text-foreground absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center"
                aria-label={t('clearFilter')}
                onClick={() => {
                  setSearchTerm('');
                  inputRef.current?.focus();
                }}
              >
                <CircleXIcon size={16} aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Region/Country Search */}
          <div className="relative flex-1 w-full sm:w-auto lg:max-w-[250px]">
            <Input
              id={`${id}-region-country-input`}
              className={cn(
                'peer w-full ps-9',
                Boolean(regionCountrySearch) && 'pe-9',
              )}
              value={regionCountrySearch}
              onChange={(e) => setRegionCountrySearch(e.target.value)}
              placeholder={t('regionCountryPlaceholder')}
              aria-label={t('regionCountryPlaceholder')}
              type="text"
            />
            <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
              <ListFilterIcon size={16} aria-hidden="true" />
            </div>
            {Boolean(regionCountrySearch) && (
              <button
                className="text-muted-foreground/80 hover:text-foreground absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center"
                aria-label={t('clearFilter')}
                onClick={() => {
                  setRegionCountrySearch('');
                }}
              >
                <CircleXIcon size={16} aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Theme Search */}
          <div className="relative flex-1 w-full sm:w-auto lg:max-w-[250px]">
            <Input
              id={`${id}-theme-input`}
              className={cn('peer w-full ps-9', Boolean(themeSearch) && 'pe-9')}
              value={themeSearch}
              onChange={(e) => setThemeSearch(e.target.value)}
              placeholder={t('themePlaceholder')}
              aria-label={t('themePlaceholder')}
              type="text"
            />
            <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
              <ListFilterIcon size={16} aria-hidden="true" />
            </div>
            {Boolean(themeSearch) && (
              <button
                className="text-muted-foreground/80 hover:text-foreground absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center"
                aria-label={t('clearFilter')}
                onClick={() => {
                  setThemeSearch('');
                }}
              >
                <CircleXIcon size={16} aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Deadline Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'flex-shrink-0 min-w-0 whitespace-nowrap',
                  !deadlineDate && 'text-muted-foreground',
                )}
              >
                <CalendarIcon
                  className="-ms-1 opacity-60"
                  size={16}
                  aria-hidden="true"
                />
                {deadlineDate
                  ? format(deadlineDate, 'MMM d, yyyy')
                  : t('filters.selectDeadline')}
                {deadlineDate && (
                  <span
                    className="text-muted-foreground/70 hover:text-foreground -me-2 ms-1 inline-flex items-center cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate({
                        search: (prev) => ({ ...prev, deadline: 'none' }),
                        replace: true,
                      });
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        navigate({
                          search: (prev) => ({ ...prev, deadline: 'none' }),
                          replace: true,
                        });
                      }
                    }}
                    aria-label={t('clearFilter')}
                  >
                    <CircleXIcon size={14} aria-hidden="true" />
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={deadlineDate}
                onSelect={(date) =>
                  navigate({
                    search: (prev) => ({
                      ...prev,
                      deadline: date ? format(date, 'yyyy-MM-dd') : 'none',
                      page: 0,
                    }),
                    replace: true,
                  })
                }
              />
            </PopoverContent>
          </Popover>

          {/* Filter By ILO Eligibility */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="flex-shrink-0 min-w-0 whitespace-nowrap bg-transparent"
              >
                <FilterIcon
                  className="-ms-1 opacity-60"
                  size={16}
                  aria-hidden="true"
                />
                {t('filters.eligibility')}
                {search.eligible !== 'all' && (
                  <span className="bg-background text-muted-foreground/70 -me-1 inline-flex h-5 max-h-full items-center rounded border px-1 font-[inherit] text-[0.625rem] font-medium">
                    {search.eligible === 'true'
                      ? t('filters.eligibilityYes')
                      : t('filters.eligibilityNo')}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto min-w-48 p-3" align="start">
              <div className="space-y-3">
                <div className="text-muted-foreground text-xs font-medium">
                  {t('filters.eligibilityLabel')}
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`${id}-eligibility-true`}
                      checked={search.eligible === 'true'}
                      onCheckedChange={(checked: boolean) => {
                        navigate({
                          search: (prev) => ({
                            ...prev,
                            eligible: checked ? 'true' : 'all',
                            page: 0,
                          }),
                          replace: true,
                        });
                      }}
                    />
                    <Label
                      htmlFor={`${id}-eligibility-true`}
                      className="flex grow justify-between gap-2 font-normal text-sm"
                    >
                      {t('filters.eligibilityYes')}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`${id}-eligibility-false`}
                      checked={search.eligible === 'false'}
                      onCheckedChange={(checked: boolean) => {
                        navigate({
                          search: (prev) => ({
                            ...prev,
                            eligible: checked ? 'false' : 'all',
                            page: 0,
                          }),
                          replace: true,
                        });
                      }}
                    />
                    <Label
                      htmlFor={`${id}-eligibility-false`}
                      className="flex grow justify-between gap-2 font-normal text-sm"
                    >
                      {t('filters.eligibilityNo')}
                    </Label>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Match Filter */}
          <div className="relative flex-shrink-0 w-[100px]">
            <Input
              id={`${id}-match-input`}
              className={cn('peer w-full ps-9', Boolean(matchInput) && 'pe-9')}
              value={matchInput}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^\d{0,3}$/.test(value)) {
                  const numValue = Number(value);
                  if (value === '' || (numValue >= 0 && numValue <= 100)) {
                    setMatchInput(value);
                  }
                }
              }}
              placeholder={t('matchPlaceholder')}
              aria-label={t('matchPlaceholder')}
              type="text"
              inputMode="numeric"
            />
            <div className="text-muted-foreground/80 pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
              <ListFilterIcon size={16} aria-hidden="true" />
            </div>
            {Boolean(matchInput) && (
              <button
                className="text-muted-foreground/80 hover:text-foreground absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center"
                aria-label={t('clearFilter')}
                onClick={() => {
                  setMatchInput('');
                }}
              >
                <CircleXIcon size={16} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Actions */}
        <div className="flex flex-wrap items-center gap-3 lg:justify-end shrink-0">
          {/* Delete */}
          {isAdmin && table.getSelectedRowModel().rows.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="bg-transparent" variant="outline">
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
                      {t('deleteDialog.title')}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('deleteDialog.description', {
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
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                      onSelect={(event) => event.preventDefault()}
                    >
                      {t('columns.' + column.id)}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Add new proposal*/}
          <Button
            className="bg-transparent"
            variant="outline"
            onClick={handleAdd}
          >
            <PlusIcon className="-ms-1 opacity-60" size={16} />
            {t('actions.addProposal')}
          </Button>
        </div>
      </div>

      {/* Table View */}
      <div className="bg-background overflow-hidden rounded-md border">
        <Table className="table-fixed">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: `${header.getSize()}px` }}
                    className="h-11"
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <div
                        className={cn(
                          'flex h-full cursor-pointer items-center justify-between gap-2 select-none overflow-hidden',
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                        onKeyDown={(e) => {
                          if (
                            header.column.getCanSort() &&
                            (e.key === 'Enter' || e.key === ' ')
                          ) {
                            e.preventDefault();
                            header.column.getToggleSortingHandler()?.(e);
                          }
                        }}
                        tabIndex={header.column.getCanSort() ? 0 : undefined}
                      >
                        <span className="truncate">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                        </span>
                        {{
                          asc: (
                            <ChevronUpIcon
                              className="shrink-0 opacity-60"
                              size={16}
                            />
                          ),
                          desc: (
                            <ChevronDownIcon
                              className="shrink-0 opacity-60"
                              size={16}
                            />
                          ),
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="last:py-0">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
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

      {/* Pagination footer */}
      <div className="flex items-center justify-between gap-8">
        {/* Results per page */}
        <div className="flex items-center gap-3">
          <Label htmlFor={`${id}-page-size`} className="max-sm:sr-only">
            {t('pagination.rowsPerPage')}
          </Label>
          <Select
            value={search.size.toString()}
            onValueChange={(value) => {
              navigate({
                search: (prev) => ({
                  ...prev,
                  size: Number(value),
                  page: 0,
                }),
                replace: true,
              });
            }}
          >
            <SelectTrigger
              id={`${id}-page-size`}
              className="w-fit whitespace-nowrap"
            >
              <SelectValue placeholder={t('pagination.selectRows')} />
            </SelectTrigger>
            <SelectContent className="[&_*[role=option]]:ps-2 [&_*[role=option]]:pe-8 [&_*[role=option]>span]:start-auto [&_*[role=option]>span]:end-2">
              {DEFAULT_PAGINATION_SIZES.map((pageSize) => (
                <SelectItem key={pageSize} value={pageSize.toString()}>
                  {pageSize}
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
              const currentPage = search.page;
              const pageSize = search.size;
              const numberOfElements = rows.length;
              const start = total === 0 ? 0 : currentPage * pageSize + 1;
              const end =
                total === 0 ? 0 : Math.min(start + numberOfElements - 1, total);
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

      {/*  Edit */}
      {editingItem && (
        <EditCfpDrawer
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          cfp={editingItem}
        />
      )}

      {/* Add CfP */}
      <AddCfpDrawer open={isAddOpen} onOpenChange={setIsAddOpen} />

      {/*  Reclassify CfP */}
      <ReclassifyCfpDrawer
        open={isReclassifyOpen}
        onOpenChange={setIsReclassifyOpen}
        cfpAnalysis={reclassifyingItem}
      />
    </div>
  );
}
