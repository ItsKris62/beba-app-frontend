'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MapPin, Search, RefreshCw, Plus, Pencil, Trash2,
  Loader2, X, AlertCircle, ChevronDown,
} from 'lucide-react';
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
  type County, type Constituency, type Ward, type Stage,
} from '@/lib/locations-api';

// ─── Permission helper ────────────────────────────────────────────────────────

function canManageStages(role?: string) {
  return ['SUPER_ADMIN', 'TENANT_ADMIN', 'MANAGER'].includes(role ?? '');
}

function canDeleteStages(role?: string) {
  return ['SUPER_ADMIN', 'TENANT_ADMIN'].includes(role ?? '');
}

// ─── Stage Form Modal ─────────────────────────────────────────────────────────

interface StageFormModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editStage?: Stage | null;
}

function StageFormModal({ open, onClose, onSuccess, editStage }: StageFormModalProps) {
  const isEdit = !!editStage;

  const [name, setName] = useState('');
  const [countyId, setCountyId] = useState('');
  const [constituencyId, setConstituencyId] = useState('');
  const [wardId, setWardId] = useState('');

  const [counties, setCounties] = useState<County[]>([]);
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);

  const [loadingCounties, setLoadingCounties] = useState(false);
  const [loadingConstituencies, setLoadingConstituencies] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill when editing
  useEffect(() => {
    if (!open) return;
    setError(null);

    if (editStage) {
      setName(editStage.name);
      // Pre-fill location from stage data
      const county = editStage.ward.constituency.county;
      const constituency = editStage.ward.constituency;
      const ward = editStage.ward;
      setCountyId(county.id);
      setConstituencyId(constituency.id);
      setWardId(ward.id);
    } else {
      setName('');
      setCountyId('');
      setConstituencyId('');
      setWardId('');
    }
  }, [open, editStage]);

  // Load counties on open
  useEffect(() => {
    if (!open) return;
    setLoadingCounties(true);
    locationsApi.getCounties()
      .then(setCounties)
      .catch(() => setCounties([]))
      .finally(() => setLoadingCounties(false));
  }, [open]);

  // Load constituencies when county changes
  useEffect(() => {
    if (!countyId) { setConstituencies([]); setWards([]); return; }
    setLoadingConstituencies(true);
    locationsApi.getConstituencies(countyId)
      .then(setConstituencies)
      .catch(() => setConstituencies([]))
      .finally(() => setLoadingConstituencies(false));
    if (!editStage || editStage.ward.constituency.county.id !== countyId) {
      setConstituencyId('');
      setWardId('');
      setWards([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countyId]);

  // Load wards when constituency changes
  useEffect(() => {
    if (!constituencyId) { setWards([]); return; }
    setLoadingWards(true);
    locationsApi.getWards(constituencyId)
      .then(setWards)
      .catch(() => setWards([]))
      .finally(() => setLoadingWards(false));
    if (!editStage || editStage.ward.constituency.id !== constituencyId) {
      setWardId('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [constituencyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Stage name is required'); return; }
    if (!wardId) { setError('Please select a ward'); return; }

    setSaving(true);
    try {
      if (isEdit && editStage) {
        await stagesApi.update(editStage.id, {
          name: name.trim(),
          wardId,
        });
      } else {
        await stagesApi.create({ name: name.trim(), wardId });
      }
      onSuccess();
      handleClose();
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Failed to save stage';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setName('');
    setCountyId('');
    setConstituencyId('');
    setWardId('');
    setError(null);
    onClose();
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
            <label className="block text-xs font-medium text-gray-700">Location (County → Sub-County → Ward) *</label>

            {/* County */}
            <select
              value={countyId}
              onChange={e => setCountyId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
              required
              disabled={loadingCounties}
            >
              <option value="">
                {loadingCounties ? 'Loading counties…' : 'Select County…'}
              </option>
              {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            {/* Constituency */}
            {countyId && (
              <select
                value={constituencyId}
                onChange={e => setConstituencyId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                required
                disabled={loadingConstituencies}
              >
                <option value="">
                  {loadingConstituencies ? 'Loading sub-counties…' : 'Select Sub-County / Constituency…'}
                </option>
                {constituencies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}

            {/* Ward */}
            {constituencyId && (
              <select
                value={wardId}
                onChange={e => setWardId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                required
                disabled={loadingWards}
              >
                <option value="">
                  {loadingWards ? 'Loading wards…' : 'Select Ward…'}
                </option>
                {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1" disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={saving || !wardId || !name.trim()}>
              {saving
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEdit ? 'Saving…' : 'Creating…'}</>
                : isEdit ? 'Save Changes' : 'Create Stage'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

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
              {deleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</> : 'Delete Stage'}
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

  // Location filters
  const [counties, setCounties] = useState<County[]>([]);
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [filterCounty, setFilterCounty] = useState('');
  const [filterConstituency, setFilterConstituency] = useState('');
  const [filterWard, setFilterWard] = useState('');
  const [loadingFilterCounties, setLoadingFilterCounties] = useState(false);
  const [loadingFilterConst, setLoadingFilterConst] = useState(false);
  const [loadingFilterWards, setLoadingFilterWards] = useState(false);

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editStage, setEditStage] = useState<Stage | null>(null);
  const [deleteStage, setDeleteStage] = useState<Stage | null>(null);

  const canManage = canManageStages(user?.role);
  const canDelete = canDeleteStages(user?.role);

  // Load filter counties on mount
  useEffect(() => {
    setLoadingFilterCounties(true);
    locationsApi.getCounties()
      .then(setCounties)
      .catch(() => setCounties([]))
      .finally(() => setLoadingFilterCounties(false));
  }, []);

  // Load filter constituencies when county filter changes
  useEffect(() => {
    if (!filterCounty) { setConstituencies([]); setWards([]); setFilterConstituency(''); setFilterWard(''); return; }
    setLoadingFilterConst(true);
    locationsApi.getConstituencies(filterCounty)
      .then(setConstituencies)
      .catch(() => setConstituencies([]))
      .finally(() => setLoadingFilterConst(false));
    setFilterConstituency('');
    setFilterWard('');
    setWards([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCounty]);

  // Load filter wards when constituency filter changes
  useEffect(() => {
    if (!filterConstituency) { setWards([]); setFilterWard(''); return; }
    setLoadingFilterWards(true);
    locationsApi.getWards(filterConstituency)
      .then(setWards)
      .catch(() => setWards([]))
      .finally(() => setLoadingFilterWards(false));
    setFilterWard('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterConstituency]);

  const loadStages = useCallback(async (p = 1) => {
    setLoading(true);
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
      setStages([]);
    } finally {
      setLoading(false);
    }
  }, [filterCounty, filterConstituency, filterWard, search]);

  useEffect(() => {
    setPage(1);
    loadStages(1);
  }, [loadStages]);

  const handleSearch = (e: React.FormEvent) => {
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
            <div className="text-2xl font-bold">{total}</div>
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
              {/* County filter */}
              <select
                value={filterCounty}
                onChange={e => setFilterCounty(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                disabled={loadingFilterCounties}
              >
                <option value="">{loadingFilterCounties ? 'Loading…' : 'All Counties'}</option>
                {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              {/* Constituency filter */}
              <select
                value={filterConstituency}
                onChange={e => setFilterConstituency(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                disabled={!filterCounty || loadingFilterConst}
              >
                <option value="">
                  {!filterCounty ? 'Select county first' : loadingFilterConst ? 'Loading…' : 'All Sub-Counties'}
                </option>
                {constituencies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>

              {/* Ward filter */}
              <select
                value={filterWard}
                onChange={e => setFilterWard(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                disabled={!filterConstituency || loadingFilterWards}
              >
                <option value="">
                  {!filterConstituency ? 'Select sub-county first' : loadingFilterWards ? 'Loading…' : 'All Wards'}
                </option>
                {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
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
              <Button type="submit" variant="outline" size="sm">Search</Button>
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
                  <TableRow key={stage.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        {stage.name}
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

      {/* ── Success toast area ── */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2" id="toast-area" />

      {/* ── Modals ── */}
      <StageFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={() => { loadStages(1); setPage(1); }}
      />

      <StageFormModal
        open={!!editStage}
        onClose={() => setEditStage(null)}
        onSuccess={() => { loadStages(page); }}
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
