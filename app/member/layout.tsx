"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { ErrorBoundary } from "@/components/error-boundary"
import { useAuth } from "@/lib/auth-context"
import { getDefaultPortalRoute } from "@/lib/role-routing"
import { isMemberRole } from "@/lib/permissions"
import { Skeleton } from "@/components/ui/skeleton"
import { SocketProvider } from "@/components/providers/SocketProvider"

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login")
    }
    if (!isLoading && isAuthenticated && user && !isMemberRole(user.role)) {
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

  if (!isMemberRole(user.role)) return null

  const displayName = `${user.firstName} ${user.lastName}`

  return (
    <AppSidebar
      userType="member"
      userName={displayName}
      memberNo={`#${user.id.slice(0, 8).toUpperCase()}`}
    >
      <ErrorBoundary resetKeys={[user.id, user.role]}>
        <SocketProvider>{children}</SocketProvider>
      </ErrorBoundary>
    </AppSidebar>
  )
}
