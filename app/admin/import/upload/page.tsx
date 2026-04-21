'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { previewImport } from '@/lib/import-api';

// Kolwa Central Ward ID – seeded in Sprint 1
// In production this would come from a ward selector
const DEFAULT_WARD_ID_KEY = 'kolwa_central_ward_id';

export default function ImportUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [wardId, setWardId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      setSelectedFile(file);
      setError(null);
    } else {
      setError('Only CSV files are accepted');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
    }
  };

  const handlePreview = async () => {
    if (!selectedFile) return setError('Please select a CSV file');
    if (!wardId.trim()) return setError('Please enter the Ward ID');

    setIsUploading(true);
    setError(null);

    try {
      const report = await previewImport(selectedFile, wardId.trim());
      // Store report in sessionStorage for the preview page
      sessionStorage.setItem('importPreviewReport', JSON.stringify(report));
      router.push('/admin/import/preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Import Members</h1>
        <p className="text-gray-500 mt-1">
          Upload a CSV file to import legacy member data from Kolwa Central Boda SACCO
        </p>
      </div>

      {/* Instructions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">CSV Format Requirements</CardTitle>
          <CardDescription>
            The CSV must contain the following columns (in any order):
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              ['NO', 'Legacy member number'],
              ['NAME', 'Full name (required)'],
              ['ID NO.', 'National ID (7-8 digits)'],
              ['PHONE NO.', 'Phone number (required)'],
              ['STAGE NAME', 'Stage/group name'],
              ['POSITION', 'CHAIRMAN / SECRETARY / MEMBER'],
              ['NEXT OF KIN CONTACT', 'Optional'],
              ['SUB COUNTY', 'e.g., KSM EAST'],
            ].map(([col, desc]) => (
              <div key={col} className="flex gap-2">
                <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-700 whitespace-nowrap">
                  {col}
                </code>
                <span className="text-gray-500">{desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ward ID input */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ward ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={wardId}
            onChange={(e) => setWardId(e.target.value)}
            placeholder="Enter the Ward UUID (e.g., from /admin/locations)"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Find the Ward ID in Admin → Locations → Kolwa Central Ward
          </p>
        </CardContent>
      </Card>

      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}
          ${selectedFile ? 'border-green-400 bg-green-50' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileSelect}
          className="hidden"
        />

        {selectedFile ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="font-medium text-green-700">{selectedFile.name}</p>
            <p className="text-sm text-gray-500">
              {(selectedFile.size / 1024).toFixed(1)} KB · Click to change
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-10 w-10 text-gray-400" />
            <p className="font-medium text-gray-700">Drop your CSV file here</p>
            <p className="text-sm text-gray-500">or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">Maximum file size: 10 MB</p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <Button
          onClick={handlePreview}
          disabled={!selectedFile || !wardId.trim() || isUploading}
          className="flex-1"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Validating CSV...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Preview Import
            </>
          )}
        </Button>
        <Button variant="outline" onClick={() => router.push('/admin/import/history')}>
          View History
        </Button>
      </div>
    </div>
  );
}
