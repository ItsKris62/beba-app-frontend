"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { useAuth, isAdmin } from "@/lib/auth-context"
import { Skeleton } from "@/components/ui/skeleton"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login")
    }
    if (!isLoading && isAuthenticated && user && !isAdmin(user.role)) {
      router.replace("/member/dashboard")
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

  if (!isAuthenticated || !user || !isAdmin(user.role)) return null

  const displayName = `${user.firstName} ${user.lastName}`

  return (
    <AppSidebar userType="admin" userName={displayName} userRole={user.role}>
      {children}
    </AppSidebar>
  )
}
