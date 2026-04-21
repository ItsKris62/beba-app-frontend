"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, CheckCircle, Eye, EyeOff, KeyRound, Shield, XCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PublicNavbar } from "@/components/public-navbar"
import { PublicFooter } from "@/components/public-footer"
import { authApi } from "@/lib/api-client"

// Password strength requirements
const REQUIREMENTS = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter (A–Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter (a–z)", test: (p: string) => /[a-z]/.test(p) },
  { label: "One digit (0–9)", test: (p: string) => /\d/.test(p) },
  { label: "One special character (!@#$…)", test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p) },
]

function PasswordStrengthIndicator({ password }: { password: string }) {
  const passed = REQUIREMENTS.filter((r) => r.test(password)).length
  const pct = (passed / REQUIREMENTS.length) * 100

  const color =
    pct <= 20 ? "bg-red-500" :
    pct <= 40 ? "bg-orange-500" :
    pct <= 60 ? "bg-yellow-500" :
    pct <= 80 ? "bg-blue-500" :
    "bg-green-500"

  const label =
    pct <= 20 ? "Very weak" :
    pct <= 40 ? "Weak" :
    pct <= 60 ? "Fair" :
    pct <= 80 ? "Good" :
    "Strong"

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Password strength</span>
        <span className={pct === 100 ? "text-green-600 font-medium" : "text-muted-foreground"}>
          {label}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="space-y-1">
        {REQUIREMENTS.map((req) => {
          const ok = req.test(password)
          return (
            <li key={req.label} className="flex items-center gap-1.5 text-xs">
              {ok ? (
                <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <span className={ok ? "text-green-700" : "text-muted-foreground"}>
                {req.label}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [showNew, setShowNew] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [success, setSuccess] = React.useState(false)

  const allRequirementsMet = REQUIREMENTS.every((r) => r.test(newPassword))
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!allRequirementsMet) {
      toast.error("Password does not meet all requirements")
      return
    }
    if (!passwordsMatch) {
      toast.error("Passwords do not match")
      return
    }

    setIsLoading(true)
    try {
      const res = await authApi.resetPassword(token, newPassword)
      if (res.success) {
        setSuccess(true)
        toast.success("Password reset successfully!")
        // Redirect to login after 3 seconds
        setTimeout(() => router.push("/login"), 3000)
      } else {
        const msg = res.error?.message ?? "Reset link is invalid or has expired"
        toast.error(msg)
      }
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <CardContent className="space-y-4">
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 ml-2">
            <strong>Password reset successfully!</strong> You will be redirected to the sign-in
            page in a moment.
          </AlertDescription>
        </Alert>
        <Button asChild className="w-full">
          <Link href="/login">Sign In Now</Link>
        </Button>
      </CardContent>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <CardContent className="space-y-5">
        {/* New Password */}
        <div className="space-y-2">
          <Label htmlFor="new-password">New Password</Label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="new-password"
              type={showNew ? "text" : "password"}
              placeholder="Enter new password"
              className="pl-9 pr-10"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
              autoFocus
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowNew((v) => !v)}
              tabIndex={-1}
              aria-label={showNew ? "Hide password" : "Show password"}
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Strength indicator — only show when user has started typing */}
        {newPassword.length > 0 && (
          <PasswordStrengthIndicator password={newPassword} />
        )}

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm New Password</Label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirm-password"
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm new password"
              className={`pl-9 pr-10 ${
                confirmPassword.length > 0
                  ? passwordsMatch
                    ? "border-green-500 focus-visible:ring-green-500"
                    : "border-red-500 focus-visible:ring-red-500"
                  : ""
              }`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowConfirm((v) => !v)}
              tabIndex={-1}
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {confirmPassword.length > 0 && !passwordsMatch && (
            <p className="text-xs text-red-600">Passwords do not match</p>
          )}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-4">
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || !allRequirementsMet || !passwordsMatch}
        >
          {isLoading ? "Resetting password…" : "Reset Password"}
        </Button>
        <Link
          href="/login"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Sign In
        </Link>
      </CardFooter>
    </form>
  )
}

function InvalidTokenCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invalid Reset Link</CardTitle>
        <CardDescription>
          This password reset link is missing, invalid, or has already been used.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 ml-2">
            Reset links expire after 15 minutes and can only be used once. Please request a new
            reset link.
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        <Button asChild className="w-full">
          <Link href="/forgot-password">Request New Reset Link</Link>
        </Button>
        <Link
          href="/login"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Sign In
        </Link>
      </CardFooter>
    </Card>
  )
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />

      <main className="flex flex-1 items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10 p-4 py-16">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 text-center">
            <Link href="/" className="inline-flex items-center">
              <span className="text-2xl font-bold text-primary">KC Boda</span>
              <span className="text-2xl font-light text-muted-foreground">|Sacco</span>
            </Link>
            <p className="mt-2 text-sm text-muted-foreground">
              Create a new secure password
            </p>
          </div>

          {!token ? (
            <InvalidTokenCard />
          ) : (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Reset Password</CardTitle>
                <CardDescription>
                  Choose a strong password for your account. The link expires in 15 minutes.
                </CardDescription>
              </CardHeader>
              <ResetPasswordForm token={token} />
            </Card>
          )}

          {/* Security Notice */}
          <div className="mt-6 rounded-lg border bg-card p-4">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="text-sm">
                <p className="font-medium">Security notice</p>
                <p className="text-muted-foreground">
                  After resetting your password, all existing sessions will be signed out.
                  You will need to sign in again on all devices.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  )
}
