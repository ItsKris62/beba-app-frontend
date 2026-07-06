"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { jwtDecode } from "jwt-decode";
import { authApi, tokenStore, refreshAccessToken, type LoginResponse } from "./api-client";
import {
  canApproveLoans as canApproveLoansForRole,
  canWriteAdminRecords,
  isAdminRole,
  isMemberRole,
  isSuperAdminRole,
} from "./permissions";
import { normalizeRole } from "@/types/roles";

interface AuthContextValue {
  user: LoginResponse["user"] | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string, totpToken?: string, backupCode?: string) => Promise<{ success: boolean; user?: LoginResponse["user"]; error?: string; requires2FA?: boolean; setupToken?: string }>;
  /** First-login PIN verification — issues a full session, same as login(). */
  loginWithPin: (phone: string, pin: string) => Promise<{ success: boolean; user?: LoginResponse["user"]; error?: string }>;
  logout: () => Promise<void>;
  /** Update the stored user object (e.g. after mustChangePassword is cleared) */
  updateUser: (patch: Partial<LoginResponse["user"]>) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => ({ success: false }),
  loginWithPin: async () => ({ success: false }),
  logout: async () => {},
  updateUser: () => {},
});

interface JwtUserPayload {
  sub?: string;
  email?: string;
  role?: string;
  tenantId?: string;
  firstName?: string;
  lastName?: string;
}

function normalizeUser(user: LoginResponse["user"]): LoginResponse["user"] {
  return { ...user, role: normalizeRole(user.role) ?? user.role };
}

function userFromToken(token: string): LoginResponse["user"] | null {
  try {
    const payload = jwtDecode<JwtUserPayload>(token);
    if (!payload.sub || !payload.email || !payload.role || !payload.tenantId) return null;
    const normalizedRole = normalizeRole(payload.role);
    if (!normalizedRole) return null;
    const [fallbackFirstName = "User"] = payload.email.split("@");
    return {
      id: payload.sub,
      email: payload.email,
      firstName: payload.firstName ?? fallbackFirstName,
      lastName: payload.lastName ?? "",
      role: normalizedRole,
      tenantId: payload.tenantId,
      mustChangePassword: false,
    };
  } catch {
    return null;
  }
}

function reconcileUserWithToken(
  stored: LoginResponse["user"] | null,
  token: string,
): LoginResponse["user"] | null {
  const decoded = userFromToken(token);
  if (!stored) return decoded;
  if (!decoded) return normalizeUser(stored);
  return {
    ...normalizeUser(stored),
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
    tenantId: decoded.tenantId,
  };
}

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
      const decoded = tokenStore.getAccess() ? userFromToken(tokenStore.getAccess()!) : null;
      if (decoded) setUser(decoded);
      setIsLoading(false);
      return;
    }

    refreshAccessToken().then((token) => {
      if (token) {
        setUser(reconcileUserWithToken(stored, token));
      } else {
        // Refresh failed (expired / rotated) — force re-login
        tokenStore.clear();
      }
      setIsLoading(false);
    });
  }, []);

  const login = useCallback(async (identifier: string, password: string, totpToken?: string, backupCode?: string) => {
    const res = await authApi.login(identifier, password, totpToken, backupCode);
    if (!res.success || !res.data) {
      const message = res.error?.message ?? "Login failed";
      if (message.includes("Email not verified")) {
        return {
          success: false,
          error: "Please verify your email before logging in. Use the verification email we sent, or request a new link.",
        };
      }
      return { 
        success: false, 
        error: message,
        requires2FA: (res.error?.debug?.rawBody as any)?.requires2FA,
        setupToken: (res.error?.debug?.rawBody as any)?.setupToken,
      };
    }
    const normalizedUser = normalizeUser(res.data.user);
    tokenStore.set(res.data.accessToken, res.data.refreshToken, normalizedUser, {
      persistRefresh: !res.data.migrateRefreshToken,
    });
    setUser(normalizedUser);
    return { success: true, user: normalizedUser };
  }, []);

  const loginWithPin = useCallback(async (phone: string, pin: string) => {
    const res = await authApi.verifyPin(phone, pin);
    if (!res.success || !res.data) {
      return { success: false, error: res.error?.message ?? "Invalid phone number or PIN" };
    }
    const normalizedUser = normalizeUser(res.data.user);
    tokenStore.set(res.data.accessToken, res.data.refreshToken, normalizedUser, {
      persistRefresh: !res.data.migrateRefreshToken,
    });
    setUser(normalizedUser);
    return { success: true, user: normalizedUser };
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
      const updated = normalizeUser({ ...prev, ...patch });
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
        loginWithPin,
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
  return isAdminRole(role)
}

export function isMember(role?: string) {
  return isMemberRole(role)
}

/** TELLER and above can create/edit records (not approve/disburse loans) */
export function canWrite(role?: string) {
  return canWriteAdminRecords(role)
}

/** Only MANAGER and above can approve, reject, or disburse loans */
export function canApproveLoans(role?: string) {
  return canApproveLoansForRole(role)
}

/** Only SUPER_ADMIN can manage tenants */
export function isSuperAdmin(role?: string) {
  return isSuperAdminRole(role)
}
