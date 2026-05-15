import { tokenStore, authApi } from './api-client';

export function getCurrentUser() {
  return tokenStore.getUser();
}

export function isAuthenticated(): boolean {
  return tokenStore.getAccess() !== null;
}

export async function logout(): Promise<void> {
  try {
    await authApi.logout();
  } catch {
    // best-effort: clear local state regardless
  } finally {
    tokenStore.clear();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
}
