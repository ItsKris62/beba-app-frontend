"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { ErrorBoundary, DashboardErrorFallback } from "@/components/error-boundary"
import { useAuth, isAdmin } from "@/lib/auth-context"
import { Skeleton } from "@/components/ui/skeleton"
import { getDefaultPortalRoute } from "@/lib/role-routing"

// Only the dashboard and reports pages fetch large cross-cutting stats
// payloads prone to the wake-up/network-error dance (see
// use-network-error-retry.ts) — a render crash there is plausibly stale
// data, not a broken feature. Every other admin page keeps the generic
// DefaultErrorFallback so a crash isn't mislabeled as a data-freshness issue.
const DASHBOARD_ERROR_FALLBACK_ROUTES = ["/admin/dashboard", "/admin/reports"]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const useDashboardFallback = DASHBOARD_ERROR_FALLBACK_ROUTES.some((route) => pathname?.startsWith(route))

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login")
    }
    if (!isLoading && isAuthenticated && user?.mustChangePassword) {
      router.replace("/change-password")
    }
    if (!isLoading && isAuthenticated && user && !user.mustChangePassword && !isAdmin(user.role)) {
      router.replace(getDefaultPortalRoute(user.role))
    }
  }, [isLoading, isAuthenticated, user, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) return null

  if (user.mustChangePassword) return null

  if (!isAdmin(user.role)) return null

  const displayName = `${user.firstName} ${user.lastName}`

  return (
    <AppSidebar userType="admin" userName={displayName} userRole={user.role}>
      <ErrorBoundary
        resetKeys={[user.id, user.role, pathname]}
        fallback={useDashboardFallback ? <DashboardErrorFallback /> : undefined}
      >
        {children}
      </ErrorBoundary>
    </AppSidebar>
  )
}
