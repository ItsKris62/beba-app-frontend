'use client';

import { useCallback, useRef, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
// Mirrors the backend's allowed KYC document MIME types (documents.service.ts).
// The <input accept> attribute is a UX hint only — it doesn't stop a
// drag-and-drop or a programmatically constructed File, so this check has to
// run here too, before any network round-trip.
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

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
  | 'QUARANTINE'
  | 'DELETED';

export interface UploadIntentResponse {
  documentId: string;
  uploadUrl?: string;
  preSignedUrl?: string;
  objectKey: string;
  uploadToken?: string;
  expiresIn: number;
  maxBytes: number;
}

type UploadResult =
  | { success: true; documentId: string }
  | { success: false; status?: number; message: string };

export type UploadStatus =
  | 'idle'
  | 'requesting'
  | 'uploading'
  | 'confirming'
  | 'success'
  | 'error'
  | 'quarantine';

type UploadState = {
  progress: number;
  status: UploadStatus;
  error: string | null;
  retryCount: number;
  documentId?: string;
  abortController?: AbortController;
};

type ConfirmUpload = (params: {
  documentId: string;
  checksum: string;
  uploadToken?: string;
}) => Promise<UploadResult>;

function apiUrl(path: string): string {
  return `${API_BASE.replace(/\/$/, '')}${path}`;
}

async function errorMessage(response: Response): Promise<string> {
  const fallback = response.status === 409
    ? 'Upload session expired. Please restart the upload.'
    : 'Upload failed';

  try {
    const body = await response.json() as { message?: string; detail?: string; title?: string };
    return body.message ?? body.detail ?? body.title ?? fallback;
  } catch {
    return fallback;
  }
}

/** Returns an error message if the file fails client-side type/size checks, or null if it's valid. */
export function validateDocumentFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return 'Unsupported file type. Upload a JPEG, PNG, WebP, or PDF file.';
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `File must be ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB or smaller`;
  }
  return null;
}

export async function computeDocumentChecksum(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function useDocumentUpload(
  tenantId?: string,
  token?: string,
  options?: {
    onProgress?: (percent: number) => void;
    onTokenExpiry?: () => void;
    onQuarantine?: (reason: string) => void;
  },
) {
  const activeXhrRef = useRef<XMLHttpRequest | null>(null);
  const lastUploadRef = useRef<{
    file: File;
    intent: UploadIntentResponse;
    confirmUpload: ConfirmUpload;
  } | null>(null);

  const [state, setState] = useState<UploadState>({
    progress: 0,
    status: 'idle',
    error: null,
    retryCount: 0,
  });

  const putWithProgress = useCallback((
    file: File,
    uploadUrl: string,
    abortController = new AbortController(),
  ): Promise<void> => {
    const attemptOnce = (attempt: number): Promise<void> => {
      setState((current) => ({
        ...current,
        status: 'uploading',
        progress: attempt === 0 ? 0 : current.progress,
        retryCount: attempt,
        abortController,
      }));

      return new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        activeXhrRef.current = xhr;

        abortController.signal.addEventListener('abort', () => {
          xhr.abort();
        }, { once: true });

        xhr.upload.onprogress = (event) => {
          if (abortController.signal.aborted) return;
          if (!event.lengthComputable) return;
          const percent = Math.round((event.loaded / event.total) * 100);
          setState((current) => ({ ...current, progress: percent }));
          options?.onProgress?.(percent);
        };

        xhr.onload = () => {
          activeXhrRef.current = null;
          if (abortController.signal.aborted) {
            reject(new Error('Upload cancelled'));
            return;
          }
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
            return;
          }
          reject(new Error(`Storage upload failed: ${xhr.status}`));
        };

        xhr.onerror = () => {
          activeXhrRef.current = null;
          reject(new Error('Storage upload failed'));
        };
        xhr.onabort = () => {
          activeXhrRef.current = null;
          reject(new Error('Upload cancelled'));
        };
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });
    };

    const runWithRetries = async (attempt: number): Promise<void> => {
      try {
        await attemptOnce(attempt);
      } catch (error) {
        if (abortController.signal.aborted) throw error;
        if (attempt >= 3) throw error;
        const delayMs = 1000 * 2 ** attempt;
        setState((current) => ({
          ...current,
          status: 'error',
          error: `Upload failed. Retrying in ${Math.round(delayMs / 1000)}s.`,
          retryCount: attempt + 1,
        }));
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        return runWithRetries(attempt + 1);
      }
    };

    return runWithRetries(0);
  }, [options]);

  const uploadToIntent = useCallback(async (
    file: File,
    intent: UploadIntentResponse,
    confirmUpload: ConfirmUpload,
  ): Promise<UploadResult> => {
    lastUploadRef.current = { file, intent, confirmUpload };
    const abortController = new AbortController();
    setState((current) => ({
      ...current,
      status: 'uploading',
      progress: 0,
      error: null,
      documentId: intent.documentId,
      abortController,
    }));

    try {
      const uploadUrl = intent.uploadUrl ?? intent.preSignedUrl;
      if (!uploadUrl) throw new Error('Upload URL was not returned');

      await putWithProgress(file, uploadUrl, abortController);
      setState((current) => ({ ...current, status: 'confirming' }));

      const checksum = await computeDocumentChecksum(file);
      const result = await confirmUpload({
        documentId: intent.documentId,
        checksum,
        uploadToken: intent.uploadToken,
      });

      if (!result.success) {
        if (
          result.status === 400 &&
          result.message.toUpperCase().includes('FILE_INTEGRITY_CHECK_FAILED')
        ) {
          const reason = 'File integrity check failed. Contact support if this persists.';
          setState((current) => ({
            ...current,
            status: 'quarantine',
            error: reason,
          }));
          options?.onQuarantine?.(reason);
          return result;
        }
        if (result.status === 409) options?.onTokenExpiry?.();
        setState((current) => ({
          ...current,
          status: 'error',
          error: result.message,
        }));
        return result;
      }

      setState((current) => ({ ...current, status: 'success', progress: 100, error: null }));
      return { success: true, documentId: intent.documentId };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setState((current) => ({ ...current, status: 'error', error: message }));
      return { success: false, message };
    }
  }, [options, putWithProgress]);

  const retry = useCallback(() => {
    const lastUpload = lastUploadRef.current;
    if (!lastUpload) return Promise.resolve({ success: false, message: 'No upload to retry' } as UploadResult);
    return uploadToIntent(lastUpload.file, lastUpload.intent, lastUpload.confirmUpload);
  }, [uploadToIntent]);

  const cancel = useCallback(() => {
    activeXhrRef.current?.abort();
    setState((current) => {
      current.abortController?.abort();
      return {
        progress: 0,
        status: 'idle',
        error: null,
        retryCount: 0,
      };
    });
  }, []);

  const uploadFile = useCallback(async (file: File, type: DocumentType): Promise<UploadResult> => {
    if (!tenantId || !token) {
      return { success: false, message: 'Missing upload credentials' };
    }

    setState({
      progress: 0,
      status: 'requesting',
      error: null,
      retryCount: 0,
    });

    try {
      const validationError = validateDocumentFile(file);
      if (validationError) {
        throw new Error(validationError);
      }

      const checksum = await computeDocumentChecksum(file);
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
          checksum,
        }),
      });

      if (!intentResponse.ok) {
        const message = await errorMessage(intentResponse);
        setState((current) => ({ ...current, status: 'error', error: message }));
        return { success: false, status: intentResponse.status, message };
      }

      const intent = await intentResponse.json() as UploadIntentResponse;
      return uploadToIntent(file, intent, async ({ documentId, checksum: confirmedChecksum, uploadToken }) => {
        const confirmResponse = await fetch(apiUrl(`/members/documents/${documentId}/confirm`), {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-Tenant-ID': tenantId,
          },
          body: JSON.stringify({ checksum: confirmedChecksum, uploadToken }),
        });

        if (!confirmResponse.ok) {
          const message = await errorMessage(confirmResponse);
          return { success: false, status: confirmResponse.status, message };
        }

        return { success: true, documentId };
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setState((current) => ({ ...current, status: 'error', error: message }));
      return { success: false, message };
    }
  }, [tenantId, token, uploadToIntent]);

  const reset = useCallback(() => {
    setState({ progress: 0, status: 'idle', error: null, retryCount: 0 });
  }, []);

  return {
    ...state,
    uploadFile,
    uploadToIntent,
    retry,
    cancel,
    uploading: state.status === 'requesting' || state.status === 'uploading' || state.status === 'confirming',
    error: state.error,
    reset,
  };
}
