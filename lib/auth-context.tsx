"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authApi, tokenStore, type LoginResponse } from "./api-client";

interface AuthContextValue {
  user: LoginResponse["user"] | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; user?: LoginResponse["user"]; error?: string }>;
  logout: () => Promise<void>;
  /** Update the stored user object (e.g. after mustChangePassword is cleared) */
  updateUser: (patch: Partial<LoginResponse["user"]>) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => ({ success: false }),
  logout: async () => {},
  updateUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<LoginResponse["user"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = tokenStore.getUser();
    if (stored && tokenStore.getAccess()) {
      setUser(stored);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    if (!res.success || !res.data) {
      return { success: false, error: res.error?.message ?? "Login failed" };
    }
    tokenStore.set(res.data.accessToken, res.data.refreshToken, res.data.user);
    setUser(res.data.user);
    return { success: true, user: res.data.user };
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    tokenStore.clear();
    setUser(null);
    router.push("/login");
  }, [router]);

  const updateUser = useCallback((patch: Partial<LoginResponse["user"]>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...patch };
      // Persist updated user to localStorage
      const access = tokenStore.getAccess();
      const refresh = tokenStore.getRefresh();
      if (access && refresh) {
        tokenStore.set(access, refresh, updated);
      }
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Role-based helpers */
export function isAdmin(role?: string) {
  return ["SUPER_ADMIN", "TENANT_ADMIN", "MANAGER", "TELLER", "AUDITOR", "CHAIRMAN"].includes(role ?? "")
}

export function isMember(role?: string) {
  return role === "MEMBER"
}

/** TELLER and above can create/edit records (not approve/disburse loans) */
export function canWrite(role?: string) {
  return ["SUPER_ADMIN", "TENANT_ADMIN", "MANAGER", "TELLER"].includes(role ?? "")
}

/** Only MANAGER and above can approve, reject, or disburse loans */
export function canApproveLoans(role?: string) {
  return ["SUPER_ADMIN", "TENANT_ADMIN", "MANAGER"].includes(role ?? "")
}

/** Only SUPER_ADMIN can manage tenants */
export function isSuperAdmin(role?: string) {
  return role === "SUPER_ADMIN"
}
