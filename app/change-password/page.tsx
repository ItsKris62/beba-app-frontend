"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Lock, ShieldCheck, CheckCircle2, XCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth, isAdmin } from "@/lib/auth-context"
import { authApi } from "@/lib/api-client"

// ─── Password strength rules ──────────────────────────────────────────────────
// Must match the backend regex:
// /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

const RULES = [
  { id: "len",   label: "At least 8 characters",            test: (v: string) => v.length >= 8 },
  { id: "upper", label: "One uppercase letter (A–Z)",        test: (v: string) => /[A-Z]/.test(v) },
  { id: "lower", label: "One lowercase letter (a–z)",        test: (v: string) => /[a-z]/.test(v) },
  { id: "digit", label: "One number (0–9)",                  test: (v: string) => /\d/.test(v) },
  { id: "spec",  label: "One special character (@$!%*?&)",   test: (v: string) => /[@$!%*?&]/.test(v) },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function RuleItem({ label, passed }: { label: string; passed: boolean }) {
  return (
    <li className="flex items-center gap-2 text-xs">
      {passed
        ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" />
        : <XCircle     className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      <span className={passed ? "text-green-700" : "text-muted-foreground"}>{label}</span>
    </li>
  )
}

function PasswordField({
  id, label, value, onChange, error, placeholder, autoComplete,
}: {
  id: string; label: string; value: string
  onChange: (v: string) => void; error?: string
  placeholder?: string; autoComplete?: string
}) {
  const [show, setShow] = React.useState(false)
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`pl-9 pr-10 ${error ? "border-red-500 focus-visible:ring-red-500" : ""}`}
          placeholder={placeholder}
          autoComplete={autoComplete ?? "new-password"}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={() => setShow((s) => !s)}
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChangePasswordPage() {
  const router  = useRouter()
  const { user, isAuthenticated, isLoading, updateUser } = useAuth()

  const [currentPw,  setCurrentPw]  = React.useState("")
  const [newPw,      setNewPw]      = React.useState("")
  const [confirmPw,  setConfirmPw]  = React.useState("")
  const [fieldErrors, setFieldErrors] = React.useState<{
    current?: string; new?: string; confirm?: string
  }>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [done, setDone] = React.useState(false)

  // Guard: send unauthenticated visitors to login
  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login")
    }
  }, [isLoading, isAuthenticated, router])

  // Guard: users who don't need a password change go straight to their dashboard
  React.useEffect(() => {
    if (!isLoading && isAuthenticated && user && !user.mustChangePassword) {
      router.replace(isAdmin(user.role) ? "/admin/dashboard" : "/member/dashboard")
    }
  }, [isLoading, isAuthenticated, user, router])

  const passedRules   = RULES.map((r) => r.test(newPw))
  const allRulesPassed = passedRules.every(Boolean)

  function validate(): boolean {
    const e: typeof fieldErrors = {}
    if (!newPw) {
      e.new = "Enter a new password"
    } else if (!allRulesPassed) {
      e.new = "Password does not meet all the requirements below"
    }
    if (!confirmPw) {
      e.confirm = "Confirm your new password"
    } else if (newPw !== confirmPw) {
      e.confirm = "Passwords do not match"
    }
    setFieldErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)

    try {
      const res = await authApi.changePassword(newPw, confirmPw, currentPw || undefined)
      if (!res.success) {
        const msg = res.error?.message ?? "Failed to change password"
        // Map the backend's "current password is incorrect" message to the right field
        if (/current|incorrect|wrong|invalid/i.test(msg)) {
          setFieldErrors({ current: "Incorrect — this is not your current password" })
        } else {
          toast.error(msg)
        }
        return
      }

      // Unlock the app immediately by clearing the flag in-memory + localStorage
      updateUser({ mustChangePassword: false })
      setDone(true)
      toast.success("Password changed — welcome!")

      setTimeout(() => {
        router.replace(isAdmin(user?.role) ? "/admin/dashboard" : "/member/dashboard")
      }, 1200)
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Blank render while auth hydrates (avoids flash)
  if (isLoading || !user) return null

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/10 p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold text-primary">KC Boda</span>
          <span className="text-2xl font-light text-muted-foreground">|Sacco</span>
          <p className="mt-2 text-sm text-muted-foreground">
            Welcome, {user.firstName}
          </p>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-500" />
              <CardTitle>Set Your Password</CardTitle>
            </div>
            <CardDescription>
              Your account was created with a temporary password. Set a permanent one to
              access the system — you only need to do this once.
            </CardDescription>
          </CardHeader>

          {done ? (
            <CardContent className="py-10 text-center space-y-3">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
              <p className="text-base font-semibold text-green-700">Password updated!</p>
              <p className="text-sm text-muted-foreground">Taking you to your dashboard…</p>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <PasswordField
                  id="currentPw"
                  label="Temporary Password (leave blank if you signed in with a PIN)"
                  value={currentPw}
                  onChange={setCurrentPw}
                  error={fieldErrors.current}
                  placeholder="The password you were given, if any"
                  autoComplete="current-password"
                />

                <PasswordField
                  id="newPw"
                  label="New Password"
                  value={newPw}
                  onChange={setNewPw}
                  error={fieldErrors.new}
                  placeholder="Choose a strong password"
                />

                {/* Live rules checklist — only shown while typing */}
                {newPw.length > 0 && (
                  <ul className="space-y-1.5 rounded-md border bg-muted/40 px-3 py-2.5">
                    {RULES.map((r, i) => (
                      <RuleItem key={r.id} label={r.label} passed={passedRules[i]} />
                    ))}
                  </ul>
                )}

                <PasswordField
                  id="confirmPw"
                  label="Confirm New Password"
                  value={confirmPw}
                  onChange={setConfirmPw}
                  error={fieldErrors.confirm}
                  placeholder="Re-enter your new password"
                />
              </CardContent>

              <CardFooter>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Updating password…" : "Set New Password"}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  )
}
