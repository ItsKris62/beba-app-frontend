'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload, FileText, AlertCircle, CheckCircle2, Loader2,
  MapPin, ChevronRight, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { previewImport } from '@/lib/import-api';
import {
  locationsApi,
  type County, type Constituency, type Ward,
} from '@/lib/locations-api';

export default function ImportUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File state ──
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Location cascade ──
  const [counties, setCounties] = useState<County[]>([]);
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [countyId, setCountyId] = useState('');
  const [constituencyId, setConstituencyId] = useState('');
  const [wardId, setWardId] = useState('');
  const [wardName, setWardName] = useState('');
  const [locLoading, setLocLoading] = useState(false);

  // Load counties on mount
  useEffect(() => {
    locationsApi.getCounties().then(setCounties).catch(() => {});
  }, []);

  // Load constituencies when county changes
  useEffect(() => {
    if (!countyId) { setConstituencies([]); setConstituencyId(''); setWards([]); setWardId(''); return; }
    setLocLoading(true);
    locationsApi.getConstituencies(countyId)
      .then(setConstituencies)
      .catch(() => {})
      .finally(() => setLocLoading(false));
    setConstituencyId('');
    setWards([]);
    setWardId('');
  }, [countyId]);

  // Load wards when constituency changes
  useEffect(() => {
    if (!constituencyId) { setWards([]); setWardId(''); return; }
    setLocLoading(true);
    locationsApi.getWards(constituencyId)
      .then(setWards)
      .catch(() => {})
      .finally(() => setLocLoading(false));
    setWardId('');
  }, [constituencyId]);

  // ── Drag & drop ──
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) validateAndSetFile(file);
  }, []);

  const validateAndSetFile = (file: File) => {
    setError(null);
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext ?? '')) {
      setError('Only CSV or Excel files are supported (.csv, .xlsx, .xls)');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be under 10 MB');
      return;
    }
    setSelectedFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  // ── Submit ──
  const handlePreview = async () => {
    if (!selectedFile) { setError('Please select a CSV file'); return; }
    if (!wardId) { setError('Please select the ward this CSV belongs to'); return; }

    setIsUploading(true);
    setError(null);
    try {
      const result = await previewImport(selectedFile, wardId);
      // Store preview result in sessionStorage so the preview page can read it
      sessionStorage.setItem('importPreview', JSON.stringify(result));
      sessionStorage.setItem('importWardId', wardId);
      sessionStorage.setItem('importWardName', wardName);
      router.push('/admin/import/preview');
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Failed to preview import';
      setError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const selectedWard = wards.find(w => w.id === wardId);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Members from CSV</h1>
        <p className="text-muted-foreground mt-1">
          Upload the Kolwa Central Boda SACCO membership CSV to bulk-import members
        </p>
      </div>

      {/* Step 1 — Select Ward */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
            Select Ward
          </CardTitle>
          <CardDescription>
            Choose the ward this CSV data belongs to. All imported members will be linked to this ward.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* County */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">County</label>
            <select
              value={countyId}
              onChange={e => setCountyId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select County…</option>
              {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Sub-County / Constituency */}
          {countyId && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sub-County / Constituency</label>
              <select
                value={constituencyId}
                onChange={e => setConstituencyId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={locLoading}
              >
                <option value="">Select Sub-County…</option>
                {constituencies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {/* Ward */}
          {constituencyId && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Ward</label>
              <select
                value={wardId}
                onChange={e => {
                  const w = wards.find(w => w.id === e.target.value);
                  setWardId(e.target.value);
                  setWardName(w?.name ?? '');
                }}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={locLoading}
              >
                <option value="">Select Ward…</option>
                {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          )}

          {/* Selected ward confirmation */}
          {wardId && selectedWard && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">
              <MapPin className="h-4 w-4 text-green-600 shrink-0" />
              <span>Ward selected: <strong>{selectedWard.name}</strong></span>
              <Badge className="ml-auto bg-green-100 text-green-800 border-green-200 text-xs">Ready</Badge>
            </div>
          )}

          {/* Hint for Kolwa Central */}
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-xs">
              For the Kolwa Central Boda SACCO CSV: select <strong>Kisumu County</strong> → <strong>Kisumu East</strong> → <strong>Kolwa Central</strong>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Step 2 — Upload File */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
            Upload CSV File
          </CardTitle>
          <CardDescription>
            Drag and drop your CSV file or click to browse. Supports .csv, .xlsx, .xls (max 10 MB).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 cursor-pointer transition-colors
              ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'}
              ${selectedFile ? 'border-green-400 bg-green-50' : ''}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />

            {selectedFile ? (
              <>
                <CheckCircle2 className="h-10 w-10 text-green-500 mb-3" />
                <p className="font-medium text-green-800">{selectedFile.name}</p>
                <p className="text-sm text-green-600 mt-1">
                  {(selectedFile.size / 1024).toFixed(1)} KB · Click to change
                </p>
              </>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="font-medium text-muted-foreground">Drop your CSV here</p>
                <p className="text-sm text-muted-foreground/70 mt-1">or click to browse files</p>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* CSV format guide */}
          <div className="rounded-lg bg-muted/50 p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Expected CSV Columns</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {[
                ['NO', 'Row number'],
                ['NAME', 'Full name'],
                ['ID NO.', 'National ID (7-8 digits)'],
                ['PHONE NO.', 'Phone (07xx or 2547xx)'],
                ['STAGE NAME', 'Boda stage name'],
                ['POSITION', 'CHAIRMAN / SECRETARY / MEMBER'],
                ['NEXT OF KIN CONTACT', 'Optional phone'],
                ['SUB COUNTY', 'e.g. KSM EAST'],
              ].map(([col, desc]) => (
                <div key={col} className="flex gap-1">
                  <span className="font-mono text-foreground/70">{col}</span>
                  <span className="text-muted-foreground/60">— {desc}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 3 — Preview */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => router.push('/admin/import/history')}
          className="flex-1"
        >
          View Import History
        </Button>
        <Button
          onClick={handlePreview}
          disabled={!selectedFile || !wardId || isUploading}
          className="flex-1"
        >
          {isUploading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analysing…</>
          ) : (
            <><FileText className="mr-2 h-4 w-4" />Preview Import <ChevronRight className="ml-1 h-4 w-4" /></>
          )}
        </Button>
      </div>

      {!wardId && selectedFile && (
        <p className="text-center text-sm text-amber-600">
          ⚠ Please select a ward above before previewing
        </p>
      )}
    </div>
  );
}
