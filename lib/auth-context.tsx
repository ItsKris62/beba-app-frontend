"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authApi, tokenStore, refreshAccessToken, type LoginResponse } from "./api-client";

interface AuthContextValue {
  user: LoginResponse["user"] | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; user?: LoginResponse["user"]; error?: string }>;
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

  // Re-hydrate on page mount.
  // Phase 4: the access token is memory-only (not in localStorage), so after a
  // page refresh it's gone. We re-acquire it via the refresh endpoint using the
  // stored refresh token (localStorage) + the HttpOnly cookie the backend set.
  useEffect(() => {
    const stored = tokenStore.getUser();
    if (!stored) {
      setIsLoading(false);
      return;
    }

    refreshAccessToken().then((token) => {
      if (token) {
        setUser(stored);
      } else {
        // Refresh failed (expired / rotated) — force re-login
        tokenStore.clear();
      }
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await authApi.login(identifier, password);
    if (!res.success || !res.data) {
      const message = res.error?.message ?? "Login failed";
      if (message.includes("Email not verified")) {
        return {
          success: false,
          error: "Please verify your email before logging in. Use the verification email we sent, or request a new link.",
        };
      }
      return { success: false, error: message };
    }
    tokenStore.set(res.data.accessToken, res.data.refreshToken, res.data.user, {
      persistRefresh: !res.data.migrateRefreshToken,
    });
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
      // Persist updated user data to localStorage (access token stays in memory)
      const refresh = tokenStore.getRefresh();
      const access = tokenStore.getAccess();
      if (access) {
        tokenStore.set(access, refresh ?? "", updated, { persistRefresh: !!refresh });
      } else {
        localStorage.setItem('beba_user', JSON.stringify(updated));
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
