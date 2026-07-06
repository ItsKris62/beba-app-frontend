"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle, Eye, EyeOff, KeyRound, RefreshCw, XCircle } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CardContent, CardFooter } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Spinner } from "@/components/ui/spinner"
import { authApi } from "@/lib/api-client"
import { usePasswordResetStore } from "@/store/usePasswordResetStore"

// Must match the backend regex:
// /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
const PASSWORD_REQUIREMENTS = [
  { label: "At least 8 characters", test: (v: string) => v.length >= 8 },
  { label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "One lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { label: "One number", test: (v: string) => /\d/.test(v) },
  { label: "One special character (@$!%*?&)", test: (v: string) => /[@$!%*?&]/.test(v) },
] as const

const confirmSchema = z
  .object({
    pin: z.string().regex(/^\d{4,6}$/, "Enter the 4-6 digit PIN."),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[a-z]/, "Password must include a lowercase letter.")
      .regex(/[A-Z]/, "Password must include an uppercase letter.")
      .regex(/\d/, "Password must include a number.")
      .regex(/[@$!%*?&]/, "Password must include a special character (@$!%*?&)."),
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })

type ConfirmFormValues = z.infer<typeof confirmSchema>

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0")
  const seconds = (totalSeconds % 60).toString().padStart(2, "0")
  return `${minutes}:${seconds}`
}

function PasswordStrength({ password }: { password: string }) {
  const passed = PASSWORD_REQUIREMENTS.filter((r) => r.test(password)).length

  return (
    <ul className="space-y-1.5 rounded-md border bg-muted/40 px-3 py-2.5">
      {PASSWORD_REQUIREMENTS.map((r) => {
        const met = r.test(password)
        return (
          <li key={r.label} className="flex items-center gap-2 text-xs">
            {met ? (
              <CheckCircle className="h-3.5 w-3.5 shrink-0 text-green-600" />
            ) : (
              <XCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className={met ? "text-green-700" : "text-muted-foreground"}>{r.label}</span>
          </li>
        )
      })}
      <li className="pt-0.5 text-[11px] text-muted-foreground">{passed}/{PASSWORD_REQUIREMENTS.length} met</li>
    </ul>
  )
}

export function StepConfirm() {
  const [showNewPassword, setShowNewPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)

  const phone = usePasswordResetStore((state) => state.phone)
  const pin = usePasswordResetStore((state) => state.pin)
  const newPassword = usePasswordResetStore((state) => state.newPassword)
  const confirmPassword = usePasswordResetStore((state) => state.confirmPassword)
  const timeRemaining = usePasswordResetStore((state) => state.timeRemaining)
  const isLoading = usePasswordResetStore((state) => state.isLoading)
  const error = usePasswordResetStore((state) => state.error)
  const setPin = usePasswordResetStore((state) => state.setPin)
  const setNewPassword = usePasswordResetStore((state) => state.setNewPassword)
  const setConfirmPassword = usePasswordResetStore((state) => state.setConfirmPassword)
  const setStep = usePasswordResetStore((state) => state.setStep)
  const startTimer = usePasswordResetStore((state) => state.startTimer)
  const setLoading = usePasswordResetStore((state) => state.setLoading)
  const setError = usePasswordResetStore((state) => state.setError)
  const clearPin = usePasswordResetStore((state) => state.clearPin)

  const form = useForm<ConfirmFormValues>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { pin, newPassword, confirmPassword },
    mode: "onChange",
  })
  const watchedPassword = form.watch("newPassword")

  async function resendPin() {
    if (timeRemaining > 0 || !phone) return

    setLoading(true)
    setError(null)
    try {
      const res = await authApi.requestPasswordReset(phone)
      if (res.error?.code === "HTTP_429") {
        toast.error("Too many attempts. Please try again in a few minutes.")
        return
      }
      setPin("")
      form.setValue("pin", "")
      startTimer()
      toast.success("If the phone number is registered, a PIN has been sent.")
    } catch {
      toast.error("Unable to resend PIN. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(values: ConfirmFormValues) {
    setLoading(true)
    setError(null)

    try {
      if (!phone) {
        setStep("enter-phone")
        return
      }

      const res = await authApi.resetPasswordConfirm(
        phone,
        values.pin,
        values.newPassword,
        values.confirmPassword,
      )

      if (!res.success) {
        if (res.error?.code === "HTTP_429") {
          setError("Too many attempts. Please try again in a few minutes.")
        } else {
          const message = res.error?.message ?? "Invalid or expired PIN."
          setError(message)
          clearPin()
          form.setValue("pin", "")
        }
        return
      }

      setStep("success")
    } catch {
      setError("Unable to reset password. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-5">
          {error ? (
            <Alert variant="destructive" aria-live="polite">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <span className="text-muted-foreground">PIN expires in </span>
            <span className="font-mono font-medium" aria-live="polite">
              {formatTime(timeRemaining)}
            </span>
          </div>

          <FormField
            control={form.control}
            name="pin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>PIN</FormLabel>
                <FormControl>
                  <InputOTP
                    maxLength={6}
                    value={field.value}
                    onChange={(value) => {
                      const digits = value.replace(/\D/g, "").slice(0, 6)
                      field.onChange(digits)
                      setPin(digits)
                    }}
                    disabled={isLoading}
                    autoFocus
                    containerClassName="justify-between"
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, index) => (
                        <InputOTPSlot key={index} index={index} className="h-11 w-11 text-base" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </FormControl>
                <FormMessage aria-live="polite" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New password</FormLabel>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <FormControl>
                    <Input
                      {...field}
                      type={showNewPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className="pl-9 pr-10"
                      disabled={isLoading}
                      placeholder="Enter new password"
                      onChange={(event) => {
                        field.onChange(event)
                        setNewPassword(event.target.value)
                      }}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowNewPassword((v) => !v)}
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                    disabled={isLoading}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <FormMessage aria-live="polite" />
              </FormItem>
            )}
          />

          {watchedPassword ? <PasswordStrength password={watchedPassword} /> : null}

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm password</FormLabel>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <FormControl>
                    <Input
                      {...field}
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className="pl-9 pr-10"
                      disabled={isLoading}
                      placeholder="Confirm new password"
                      onChange={(event) => {
                        field.onChange(event)
                        setConfirmPassword(event.target.value)
                      }}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <FormMessage aria-live="polite" />
              </FormItem>
            )}
          />
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Spinner /> : null}
            {isLoading ? "Updating password..." : "Reset Password"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isLoading || timeRemaining > 0}
            onClick={resendPin}
          >
            <RefreshCw className="h-4 w-4" />
            Resend PIN
          </Button>
        </CardFooter>
      </form>
    </Form>
  )
}
