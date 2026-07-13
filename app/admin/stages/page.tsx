'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MapPin, Search, RefreshCw, Plus, Pencil, Trash2,
  Loader2, X, AlertCircle, ChevronDown, Check, ChevronsUpDown
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/use-debounce';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/lib/auth-context';
import {
  locationsApi, stagesApi,
  type Stage,
} from '@/lib/locations-api';

// ─── Permission helpers ───────────────────────────────────────────────────────

function canManageStages(role?: string) {
  return ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER'].includes(role ?? '');
}

function canDeleteStages(role?: string) {
  return ['SUPER_ADMIN', 'TENANT_ADMIN'].includes(role ?? '');
}

/** Stages created optimistically (before the DB round-trip completes) have temp IDs. */
function isOptimisticStage(stage: Stage) {
  return stage.id.startsWith('temp-');
}

// ─── LocationCombobox ─────────────────────────────────────────────────────────

function LocationCombobox({
  value,
  onChange,
  items,
  loading,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  items: { id: string; name: string }[];
  loading?: boolean;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedItem = items.find(item => item.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal bg-background px-3 py-2 text-sm text-left h-auto min-h-[40px]',
            !value && 'text-muted-foreground',
          )}
          disabled={disabled || loading}
        >
          {loading
            ? `Loading ${placeholder.toLowerCase()}...`
            : selectedItem
              ? selectedItem.name
              : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {items.map(item => (
                <CommandItem
                  key={item.id}
                  value={item.name}
                  onSelect={() => {
                    onChange(item.id === value ? '' : item.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === item.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {item.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── StageFormModal ───────────────────────────────────────────────────────────

interface StageFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Called synchronously before the API request so the UI can update optimistically. */
  onSuccess: (stage: Stage) => void;
  /** Called after the background API request finishes (success or failure). */
  onComplete: () => void;
  editStage?: Stage | null;
}

function StageFormModal({
  open,
  onClose,
  onSuccess,
  onComplete,
  editStage,
}: StageFormModalProps) {
  const isEdit = !!editStage;
  const submittedRef = useRef(false);

  const [name, setName] = useState('');
  const [countyId, setCountyId] = useState('');
  const [constituencyId, setConstituencyId] = useState('');
  const [wardId, setWardId] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Use React Query directly — no local state copies that can be one render stale.
  const { data: counties = [], isLoading: loadingCounties } = useQuery({
    queryKey: ['counties'],
    queryFn: locationsApi.getCounties,
    enabled: open,
    staleTime: Infinity,
  });

  const { data: constituencies = [], isLoading: loadingConstituencies } = useQuery({
    queryKey: ['constituencies', countyId],
    queryFn: () => locationsApi.getConstituencies(countyId),
    enabled: !!countyId && open,
    staleTime: Infinity,
  });

  const { data: wards = [], isLoading: loadingWards } = useQuery({
    queryKey: ['wards', constituencyId],
    queryFn: () => locationsApi.getWards(constituencyId),
    enabled: !!constituencyId && open,
    staleTime: Infinity,
  });

  // Reset form / pre-fill for edit whenever the modal opens.
  useEffect(() => {
    if (!open) return;
    setError(null);
    submittedRef.current = false;

    if (editStage) {
      setName(editStage.name);
      setCountyId(editStage.ward.constituency.county.id);
      setConstituencyId(editStage.ward.constituency.id);
      setWardId(editStage.ward.id);
    } else {
      setName('');
      setCountyId('');
      setConstituencyId('');
      setWardId('');
    }
  }, [open, editStage]);

  // Cascade-reset sub-county when county changes (skip during initial edit population).
  useEffect(() => {
    if (!open) return;
    if (editStage && editStage.ward.constituency.county.id === countyId) return;
    setConstituencyId('');
    setWardId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countyId]);

  // Cascade-reset ward when sub-county changes.
  useEffect(() => {
    if (!open) return;
    if (editStage && editStage.ward.constituency.id === constituencyId) return;
    setWardId('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [constituencyId]);

  const handleClose = () => {
    setName('');
    setCountyId('');
    setConstituencyId('');
    setWardId('');
    setError(null);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submittedRef.current) return; // prevent double-fire

    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) { setError('Stage name is required'); return; }
    if (!wardId) { setError('Please select a ward'); return; }

    // Build ward relation from the already-loaded React Query data.
    const selectedWard = wards.find(w => w.id === wardId);
    const selectedConstituency = constituencies.find(c => c.id === constituencyId);
    const selectedCounty = counties.find(c => c.id === countyId);

    const optimisticWard =
      selectedWard && selectedConstituency && selectedCounty
        ? {
            id: selectedWard.id,
            name: selectedWard.name,
            constituency: {
              id: selectedConstituency.id,
              name: selectedConstituency.name,
              county: { id: selectedCounty.id, name: selectedCounty.name },
            },
          }
        : null;

    submittedRef.current = true;

    if (isEdit && editStage) {
      const optimisticStage: Stage = {
        ...editStage,
        name: trimmedName,
        ward: optimisticWard ?? editStage.ward,
      };

      // 1. Update UI instantly.
      onSuccess(optimisticStage);
      // 2. Close modal immediately — don't wait for the network.
      handleClose();

      // 3. Fire the real request in the background.
      stagesApi
        .update(editStage.id, { name: trimmedName, wardId })
        .then(() => toast.success('Stage updated successfully'))
        .catch((err: unknown) =>
          toast.error((err as { message?: string })?.message ?? 'Failed to update stage'),
        )
        .finally(onComplete); // always reload to confirm or revert
    } else {
      if (!optimisticWard) {
        // Location data hasn't finished loading — guard defensively.
        setError('Location data is still loading. Please wait a moment and try again.');
        submittedRef.current = false;
        return;
      }

      const optimisticStage: Stage = {
        id: `temp-${Date.now()}`,
        name: trimmedName,
        tenantId: '',
        createdAt: new Date().toISOString(),
        ward: optimisticWard,
        _count: { assignments: 0 },
      };

      // 1. Insert optimistic row.
      onSuccess(optimisticStage);
      // 2. Close modal immediately.
      handleClose();

      // 3. Background create — onComplete replaces temp row with the real DB record.
      stagesApi
        .create({ name: trimmedName, wardId })
        .then(() => toast.success('Stage created successfully'))
        .catch((err: unknown) =>
          toast.error((err as { message?: string })?.message ?? 'Failed to create stage'),
        )
        .finally(onComplete);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Edit Stage' : 'Create New Stage'}
          </h2>
          <button onClick={handleClose} className="rounded-md p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Stage Name */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Stage Name *</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. KIBOS GALYNES"
              required
              className="uppercase-placeholder"
            />
            <p className="text-xs text-gray-400 mt-1">Enter the official stage name as used by riders</p>
          </div>

          {/* Location cascade */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700">
              Location (County → Sub-County → Ward) *
            </label>

            <LocationCombobox
              value={countyId}
              onChange={setCountyId}
              items={counties}
              loading={loadingCounties}
              placeholder="Select County…"
              searchPlaceholder="Search counties..."
              emptyMessage="No county found."
            />

            {countyId && (
              <LocationCombobox
                value={constituencyId}
                onChange={setConstituencyId}
                items={constituencies}
                loading={loadingConstituencies}
                placeholder="Select Sub-County…"
                searchPlaceholder="Search sub-counties..."
                emptyMessage="No sub-county found."
                disabled={!countyId}
              />
            )}

            {constituencyId && (
              <LocationCombobox
                value={wardId}
                onChange={setWardId}
                items={wards}
                loading={loadingWards}
                placeholder="Select Ward…"
                searchPlaceholder="Search wards..."
                emptyMessage="No ward found."
                disabled={!constituencyId}
              />
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!wardId || !name.trim()}
            >
              {isEdit ? 'Save Changes' : 'Create Stage'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── DeleteConfirmModal ───────────────────────────────────────────────────────

function DeleteConfirmModal({
  stage,
  onClose,
  onSuccess,
}: {
  stage: Stage | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!stage) return;
    setDeleting(true);
    setError(null);
    try {
      await stagesApi.delete(stage.id);
      toast.success('Stage deleted successfully');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Failed to delete stage';
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };

  if (!stage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-red-700">Delete Stage</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}
          <p className="text-sm text-gray-700">
            Are you sure you want to delete <strong>&quot;{stage.name}&quot;</strong>?
          </p>
          <p className="text-xs text-gray-500">
            This action cannot be undone. Stages with active member assignments cannot be deleted.
          </p>
          <div className="flex gap-3 pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={deleting}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="flex-1"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</>
                : 'Delete Stage'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StagesPage() {
  const { user } = useAuth();
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [filterCounty, setFilterCounty] = useState('');
  const [filterConstituency, setFilterConstituency] = useState('');
  const [filterWard, setFilterWard] = useState('');

  // Location filters
  const { data: counties = [], isLoading: loadingFilterCounties } = useQuery({
    queryKey: ['counties'],
    queryFn: locationsApi.getCounties,
    staleTime: Infinity,
  });

  const { data: constituencies = [], isLoading: loadingFilterConst } = useQuery({
    queryKey: ['constituencies', filterCounty],
    queryFn: () => locationsApi.getConstituencies(filterCounty),
    enabled: !!filterCounty,
    staleTime: Infinity,
  });

  const { data: wards = [], isLoading: loadingFilterWards } = useQuery({
    queryKey: ['wards', filterConstituency],
    queryFn: () => locationsApi.getWards(filterConstituency),
    enabled: !!filterConstituency,
    staleTime: Infinity,
  });

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editStage, setEditStage] = useState<Stage | null>(null);
  const [deleteStage, setDeleteStage] = useState<Stage | null>(null);

  const canManage = canManageStages(user?.role);
  const canDelete = canDeleteStages(user?.role);

  // Clear sub-filters when parent filter changes
  useEffect(() => {
    setFilterConstituency('');
    setFilterWard('');
  }, [filterCounty]);

  useEffect(() => {
    setFilterWard('');
  }, [filterConstituency]);

  // Debounce search
  const debouncedSearch = useDebounce(searchInput, 400);

  useEffect(() => {
    setSearch(debouncedSearch);
  }, [debouncedSearch]);

  /**
   * @param silent - When true, skip the full-page loading spinner. Used for
   * background swaps after optimistic updates so the table stays visible.
   */
  const loadStages = useCallback(async (p = 1, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await stagesApi.list({
        page: p,
        limit: 20,
        countyId: filterCounty || undefined,
        constituencyId: filterConstituency || undefined,
        wardId: filterWard || undefined,
        search: search || undefined,
      });
      setStages(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.totalPages);
    } catch {
      if (!silent) setStages([]);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [filterCounty, filterConstituency, filterWard, search]);

  useEffect(() => {
    setPage(1);
    loadStages(1);
  }, [loadStages]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleClearFilters = () => {
    setFilterCounty('');
    setFilterConstituency('');
    setFilterWard('');
    setSearch('');
    setSearchInput('');
  };

  const hasFilters = filterCounty || filterConstituency || filterWard || search;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stages Management</h1>
          <p className="text-muted-foreground">
            Manage boda boda stages mapped to counties and sub-counties
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadStages(page)}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          {canManage && (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Stage
            </Button>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stages</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <div className="text-2xl font-bold">{total}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {hasFilters ? 'Matching current filters' : 'Registered in system'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Filters</CardTitle>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {[filterCounty, filterConstituency, filterWard, search].filter(Boolean).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {hasFilters
                ? <button onClick={handleClearFilters} className="text-blue-600 hover:underline">Clear all filters</button>
                : 'No filters applied'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters ── */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">Filter by Location</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <LocationCombobox
                value={filterCounty}
                onChange={setFilterCounty}
                items={counties}
                loading={loadingFilterCounties}
                placeholder="All Counties"
                searchPlaceholder="Search counties..."
                emptyMessage="No county found."
              />
              <LocationCombobox
                value={filterConstituency}
                onChange={setFilterConstituency}
                items={constituencies}
                loading={loadingFilterConst}
                placeholder={!filterCounty ? 'Select county first' : 'All Sub-Counties'}
                searchPlaceholder="Search sub-counties..."
                emptyMessage="No sub-county found."
                disabled={!filterCounty}
              />
              <LocationCombobox
                value={filterWard}
                onChange={setFilterWard}
                items={wards}
                loading={loadingFilterWards}
                placeholder={!filterConstituency ? 'Select sub-county first' : 'All Wards'}
                searchPlaceholder="Search wards..."
                emptyMessage="No ward found."
                disabled={!filterConstituency}
              />
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search stage name…"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                />
              </div>
              {hasFilters && (
                <Button type="button" variant="ghost" size="sm" onClick={handleClearFilters}>
                  Clear
                </Button>
              )}
            </form>
          </div>
        </CardContent>
      </Card>

      {/* ── Table ── */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : stages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <MapPin className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground font-medium">No stages found</p>
              <p className="text-sm text-muted-foreground">
                {hasFilters ? 'Try adjusting your filters' : 'Create the first stage to get started'}
              </p>
              {canManage && !hasFilters && (
                <Button size="sm" onClick={() => setShowCreate(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Add Stage
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Stage Name</TableHead>
                  <TableHead>County</TableHead>
                  <TableHead>Sub-County</TableHead>
                  <TableHead>Ward</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Created</TableHead>
                  {canManage && <TableHead className="w-24 text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {stages.map(stage => (
                  <TableRow
                    key={stage.id}
                    className={cn(
                      'hover:bg-muted/50',
                      isOptimisticStage(stage) && 'opacity-60',
                    )}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        {stage.name}
                        {isOptimisticStage(stage) && (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {stage.ward.constituency.county.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {stage.ward.constituency.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {stage.ward.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={stage._count.assignments > 0 ? 'default' : 'secondary'}>
                        {stage._count.assignments} member{stage._count.assignments !== 1 ? 's' : ''}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(stage.createdAt).toLocaleDateString('en-KE')}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        {isOptimisticStage(stage) ? (
                          // Disable actions until the DB round-trip confirms the real ID.
                          <div className="flex items-center justify-end pr-2">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Edit stage"
                              onClick={() => setEditStage(stage)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                title="Delete stage"
                                onClick={() => setDeleteStage(stage)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} · {total} stage{total !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              disabled={page <= 1}
              onClick={() => { const p = page - 1; setPage(p); loadStages(p); }}
            >
              Previous
            </Button>
            <Button
              variant="outline" size="sm"
              disabled={page >= totalPages}
              onClick={() => { const p = page + 1; setPage(p); loadStages(p); }}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      <StageFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={(stage) => {
          // Prepend the optimistic row immediately.
          setStages(prev => [stage, ...prev]);
          setTotal(prev => prev + 1);
        }}
        onComplete={() => {
          // Silent background fetch: swaps the temp ID with the real DB UUID,
          // reverts if the API call failed, and resets to page 1.
          setPage(1);
          loadStages(1, true);
        }}
      />

      <StageFormModal
        open={!!editStage}
        onClose={() => setEditStage(null)}
        onSuccess={(stage) => {
          // Swap the optimistic update in-place by matching on the stage ID.
          setStages(prev => prev.map(s => s.id === stage.id ? stage : s));
          setEditStage(null);
        }}
        onComplete={() => {
          // Silent background fetch to confirm or revert the optimistic edit.
          loadStages(page, true);
        }}
        editStage={editStage}
      />

      <DeleteConfirmModal
        stage={deleteStage}
        onClose={() => setDeleteStage(null)}
        onSuccess={() => { loadStages(1); setPage(1); }}
      />
    </div>
  );
}
