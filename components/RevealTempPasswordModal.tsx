"use client";

import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Copy, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usersApi } from '@/lib/api-client';

// How long a revealed temporary password stays in component state before this
// modal auto-reverts to the confirm step — a live credential fetch shouldn't
// sit in memory indefinitely just because the admin left the tab open.
const REVEAL_AUTO_CLEAR_MS = 45_000;

export interface RevealTempPasswordTarget {
  /** The user's id — this is always a `users` table id, whether the record is a member or staff account. */
  userId: string;
  name: string;
  /** Optional secondary identifier shown next to the name, e.g. a member number. */
  detail?: string;
}

type RevealState =
  | { step: 'confirm' }
  | { step: 'loading' }
  | { step: 'revealed'; password: string; showPassword: boolean; copied: boolean }
  | { step: 'error'; message: string };

/**
 * Generic reveal-on-demand dialog for GET /users/:id/reveal-temp-password.
 * Works for any user record (member or staff) — it only needs a userId,
 * not a member-specific shape.
 */
export function RevealTempPasswordModal({
  target,
  onClose,
}: {
  target: RevealTempPasswordTarget | null;
  onClose: () => void;
}) {
  const [state, setState] = useState<RevealState>({ step: 'confirm' });
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset to the confirm step for each target the modal is opened for, and
  // always clear the pending auto-clear timer — this also fires when the
  // parent closes the modal (target -> null), so the password never
  // lingers in state past the point the dialog is dismissed.
  useEffect(() => {
    setState({ step: 'confirm' });
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, [target]);

  if (!target) return null;

  const handleReveal = async () => {
    setState({ step: 'loading' });
    const res = await usersApi.revealTemporaryPassword(target.userId);
    if (res.success && res.data) {
      setState({ step: 'revealed', password: res.data.temporaryPassword, showPassword: false, copied: false });
      clearTimerRef.current = setTimeout(() => setState({ step: 'confirm' }), REVEAL_AUTO_CLEAR_MS);
    } else {
      setState({ step: 'error', message: res.error?.message ?? 'Failed to reveal the temporary password.' });
    }
  };

  const handleClose = () => {
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    setState({ step: 'confirm' });
    onClose();
  };

  const copy = () => {
    if (state.step !== 'revealed') return;
    navigator.clipboard.writeText(state.password).then(() => {
      setState(s => (s.step === 'revealed' ? { ...s, copied: true } : s));
      setTimeout(() => setState(s => (s.step === 'revealed' ? { ...s, copied: false } : s)), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Reveal Temp Password</h2>
          <button onClick={handleClose} className="rounded-md p-1 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600">
            <strong>{target.name}</strong>
            {target.detail && <> · <span className="font-mono">{target.detail}</span></>}
          </p>

          {state.step === 'confirm' && (
            <>
              <p className="text-sm text-gray-500">
                This fetches and displays this user&apos;s current temporary password from
                the server. The action is rate-limited and audited, and only works until the
                user sets their own password.
              </p>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button type="button" onClick={handleReveal} className="flex-1">
                  Reveal
                </Button>
              </div>
            </>
          )}

          {state.step === 'loading' && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Fetching…
            </div>
          )}

          {state.step === 'error' && (
            <>
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                {state.message}
              </div>
              <Button type="button" onClick={handleClose} className="w-full">Close</Button>
            </>
          )}

          {state.step === 'revealed' && (
            <>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Temporary Password</p>
                  <p className="font-mono text-sm font-semibold text-gray-900">
                    {state.showPassword ? state.password : '••••••••••••'}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => setState(s => (s.step === 'revealed' ? { ...s, showPassword: !s.showPassword } : s))}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    title={state.showPassword ? 'Hide' : 'Show'}
                  >
                    {state.showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={copy}
                    className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    title="Copy"
                  >
                    {state.copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400">
                This will clear from view automatically. Copy it before closing.
              </p>
              <Button type="button" onClick={handleClose} className="w-full">Done</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
