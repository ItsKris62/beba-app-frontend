"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Mail, Shield } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PublicNavbar } from "@/components/public-navbar"
import { PublicFooter } from "@/components/public-footer"
import { authApi } from "@/lib/api-client"

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error("Please enter your email address")
      return
    }

    setIsLoading(true)
    try {
      await authApi.forgotPassword(email.trim().toLowerCase())
      // Always show success — backend never reveals whether email exists
      setSubmitted(true)
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

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
              Reset your account password
            </p>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Forgot Password</CardTitle>
              <CardDescription>
                Enter your email address and we'll send you a link to reset your password.
              </CardDescription>
            </CardHeader>

            {submitted ? (
              <CardContent className="space-y-4">
                <Alert className="border-green-200 bg-green-50">
                  <Mail className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 ml-2">
                    <strong>Check your inbox.</strong> If an account exists for{" "}
                    <span className="font-medium">{email}</span>, you will receive a password
                    reset link within a few minutes. The link expires in 15 minutes.
                  </AlertDescription>
                </Alert>
                <p className="text-sm text-muted-foreground">
                  Didn't receive the email? Check your spam folder, or{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => setSubmitted(false)}
                  >
                    try again
                  </button>
                  .
                </p>
              </CardContent>
            ) : (
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        className="pl-9"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        autoFocus
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Sending reset link…" : "Send Reset Link"}
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
            )}

            {submitted && (
              <CardFooter>
                <Link
                  href="/login"
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Back to Sign In
                </Link>
              </CardFooter>
            )}
          </Card>

          {/* Security Notice */}
          <div className="mt-6 rounded-lg border bg-card p-4">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="text-sm">
                <p className="font-medium">Security notice</p>
                <p className="text-muted-foreground">
                  Reset links expire after 15 minutes and can only be used once.
                  Never share your reset link with anyone.
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
