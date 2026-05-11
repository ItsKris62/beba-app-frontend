'use client';

import { useCallback, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type DocumentType =
  | 'NATIONAL_ID_FRONT'
  | 'NATIONAL_ID_BACK'
  | 'KRA_PIN'
  | 'MEMBER_FORM'
  | 'OTHER';

export type DocumentStatus =
  | 'PENDING_UPLOAD'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'DELETED';

type UploadIntent = {
  documentId: string;
  uploadUrl?: string;
  preSignedUrl?: string;
  maxBytes?: number;
};

type UploadResult =
  | { success: true; documentId: string }
  | { success: false; status?: number; message: string };

function apiUrl(path: string): string {
  return `${API_BASE.replace(/\/$/, '')}${path}`;
}

async function errorMessage(response: Response): Promise<string> {
  const fallback = response.status === 409
    ? 'A document of this type is already being processed'
    : 'Upload failed';

  try {
    const body = await response.json() as { message?: string; detail?: string; title?: string };
    return body.message ?? body.detail ?? body.title ?? fallback;
  } catch {
    return fallback;
  }
}

export function useDocumentUpload(tenantId: string, token: string) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File, type: DocumentType): Promise<UploadResult> => {
    setUploading(true);
    setError(null);

    try {
      if (file.size > MAX_UPLOAD_BYTES) {
        throw new Error(`File must be ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB or smaller`);
      }

      const intentResponse = await fetch(apiUrl('/members/documents/upload-url'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
        },
        body: JSON.stringify({
          type,
          originalFileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      });

      if (!intentResponse.ok) {
        const message = await errorMessage(intentResponse);
        setError(message);
        return { success: false, status: intentResponse.status, message };
      }

      const intent = await intentResponse.json() as UploadIntent;
      const uploadUrl = intent.uploadUrl ?? intent.preSignedUrl;
      if (!uploadUrl) {
        throw new Error('Upload URL was not returned');
      }

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadResponse.ok) {
        throw new Error('Storage upload failed');
      }

      const confirmResponse = await fetch(apiUrl(`/members/documents/${intent.documentId}/confirm`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Tenant-ID': tenantId,
        },
        body: JSON.stringify({}),
      });

      if (!confirmResponse.ok) {
        const message = await errorMessage(confirmResponse);
        setError(message);
        return { success: false, status: confirmResponse.status, message };
      }

      return { success: true, documentId: intent.documentId };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setError(message);
      return { success: false, message };
    } finally {
      setUploading(false);
    }
  }, [tenantId, token]);

  return { uploadFile, uploading, error };
}
