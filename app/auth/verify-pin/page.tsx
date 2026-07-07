"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, KeyRound, Phone, Shield } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { PublicNavbar } from "@/components/public-navbar"
import { PublicFooter } from "@/components/public-footer"
import { useAuth } from "@/lib/auth-context"
import { authApi } from "@/lib/api-client"
import { resolvePostLoginRedirect } from "@/lib/role-routing"
import { normalizeKenyanPhone, displayKenyanPhone } from "@/lib/utils"

const RESEND_COOLDOWN_SECONDS = 60

function VerifyPinContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { loginWithPin } = useAuth()

  const [phone, setPhone] = React.useState(() =>
    normalizeKenyanPhone(searchParams.get("phone") ?? ""),
  )
  const [pin, setPin] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [cooldown, setCooldown] = React.useState(0)
  const [isResending, setIsResending] = React.useState(false)

  React.useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setInterval(() => {
      setCooldown((s) => Math.max(0, s - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldown])

  const phoneValid = /^\+254[17]\d{8}$/.test(phone)
  const pinValid = /^\d{4,6}$/.test(pin)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (!phoneValid) {
      setError("Enter a valid Kenyan phone number.")
      return
    }
    if (!pinValid) {
      setError("Enter the 4-6 digit PIN sent to your phone.")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await loginWithPin(phone, pin)
      if (!result.success || !result.user) {
        setError("Invalid phone number or PIN")
        return
      }

      toast.success("Verified! Let's set up your password.")
      if (result.user.mustChangePassword) {
        router.replace("/change-password")
      } else {
        router.replace(resolvePostLoginRedirect(result.user))
      }
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResend() {
    if (!phoneValid || cooldown > 0) return
    setIsResending(true)
    try {
      const res = await authApi.requestPasswordReset(phone)
      if (res.error?.code === "HTTP_429") {
        toast.error("Too many attempts. Please try again in a few minutes.")
      } else {
        toast.success("If the phone number is registered, a PIN has been sent.")
      }
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch {
      toast.error("Unable to resend PIN. Please try again.")
    } finally {
      setIsResending(false)
    }
  }

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
              First time signing in? Verify with the PIN sent to your phone.
            </p>
          </div>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle>Verify Your PIN</CardTitle>
              <CardDescription>
                Enter your phone number and the PIN we sent you via SMS.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-5">
                {error ? (
                  <Alert variant="destructive" aria-live="polite">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <div className="flex rounded-md border bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring">
                    <span className="inline-flex items-center border-r px-3 text-sm font-medium text-muted-foreground">
                      <Phone className="mr-1.5 h-3.5 w-3.5" />
                      +254
                    </span>
                    <Input
                      id="phone"
                      value={displayKenyanPhone(phone)}
                      inputMode="numeric"
                      autoComplete="tel-national"
                      maxLength={9}
                      className="border-0 shadow-none focus-visible:ring-0"
                      placeholder="712345678"
                      disabled={isSubmitting}
                      onChange={(e) => setPhone(normalizeKenyanPhone(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pin">
                    <KeyRound className="mr-1 inline h-3.5 w-3.5" />
                    PIN
                  </Label>
                  <InputOTP
                    maxLength={6}
                    value={pin}
                    onChange={(value) => setPin(value.replace(/\D/g, "").slice(0, 6))}
                    disabled={isSubmitting}
                    containerClassName="justify-between"
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, index) => (
                        <InputOTPSlot key={index} index={index} className="h-11 w-11 text-base" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  <p className="text-xs text-muted-foreground">
                    Your PIN may be 4-6 digits — fill in as many boxes as your PIN has.
                  </p>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Verifying..." : "Verify & Continue"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isResending || cooldown > 0 || !phoneValid}
                  onClick={handleResend}
                >
                  {cooldown > 0 ? `Resend PIN (${cooldown}s)` : isResending ? "Sending..." : "Resend PIN"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <div className="mt-6 rounded-lg border bg-card p-4">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="text-sm">
                <p className="font-medium">Security notice</p>
                <p className="text-muted-foreground">
                  Your PIN expires 20 minutes after it&apos;s sent and can only be used once.
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

export default function VerifyPinPage() {
  return (
    <React.Suspense fallback={
      <div className="flex min-h-screen flex-col">
        <PublicNavbar />
        <main className="flex flex-1 items-center justify-center p-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </main>
        <PublicFooter />
      </div>
    }>
      <VerifyPinContent />
    </React.Suspense>
  )
}
