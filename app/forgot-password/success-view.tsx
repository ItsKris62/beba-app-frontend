"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CardContent, CardFooter } from "@/components/ui/card"
import { usePasswordResetStore } from "@/store/usePasswordResetStore"

export function SuccessView() {
  const router = useRouter()
  const resetFlow = usePasswordResetStore((state) => state.resetFlow)

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      resetFlow()
      router.push("/login")
    }, 3000)

    return () => {
      window.clearTimeout(timeoutId)
      resetFlow()
    }
  }, [resetFlow, router])

  return (
    <>
      <CardContent className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" aria-hidden="true" />
        <div className="space-y-2" aria-live="polite">
          <h2 className="text-xl font-semibold">Password updated successfully.</h2>
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </CardContent>
      <CardFooter>
        <Button asChild className="w-full">
          <Link href="/login">Sign in now</Link>
        </Button>
      </CardFooter>
    </>
  )
}
