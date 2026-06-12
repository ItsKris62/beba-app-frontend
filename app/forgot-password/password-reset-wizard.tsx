"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Shield } from "lucide-react"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PublicFooter } from "@/components/public-footer"
import { PublicNavbar } from "@/components/public-navbar"
import { usePasswordResetStore } from "@/store/usePasswordResetStore"

import { StepRequest } from "./step-request"
import { StepReset } from "./step-reset"
import { StepVerify } from "./step-verify"
import { SuccessView } from "./success-view"

function usePasswordResetTimer() {
  const syncTimer = usePasswordResetStore((state) => state.syncTimer)

  React.useEffect(() => {
    syncTimer()
    const intervalId = window.setInterval(syncTimer, 1000)

    return () => window.clearInterval(intervalId)
  }, [syncTimer])
}

function StepContent() {
  const step = usePasswordResetStore((state) => state.step)

  if (step === "verify-otp") {
    return <StepVerify />
  }

  if (step === "set-password") {
    return <StepReset />
  }

  if (step === "success") {
    return <SuccessView />
  }

  return <StepRequest />
}

export function PasswordResetWizard() {
  usePasswordResetTimer()

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />

      <main className="flex flex-1 items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10 p-4 py-16">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex items-center">
              <span className="text-2xl font-bold text-primary">KC Boda</span>
              <span className="text-2xl font-light text-muted-foreground">|Sacco</span>
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">
              Reset your password by email or SMS OTP
            </p>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Forgot Password</CardTitle>
              <CardDescription>
                Choose where to receive your one-time password. For your security, we always show
                the same confirmation message.
              </CardDescription>
            </CardHeader>
            <StepContent />
          </Card>

          <div className="mt-6 rounded-lg border bg-card p-4">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="text-sm">
                <p className="font-medium">Security notice</p>
                <p className="text-muted-foreground">
                  OTP codes expire after 30 minutes. Never share your code or password with anyone.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/login"
            className="mx-auto mt-5 flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Sign In
          </Link>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
