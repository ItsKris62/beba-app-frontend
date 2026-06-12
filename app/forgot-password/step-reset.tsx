"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle, Eye, EyeOff, KeyRound, XCircle } from "lucide-react"
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
import { Progress } from "@/components/ui/progress"
import { Spinner } from "@/components/ui/spinner"
import { ApiError, verifyAndResetPassword } from "@/lib/api/auth.service"
import { usePasswordResetStore } from "@/store/usePasswordResetStore"

const PASSWORD_REQUIREMENTS = [
  { label: "At least 8 characters", test: (password: string) => password.length >= 8 },
  { label: "One uppercase letter", test: (password: string) => /[A-Z]/.test(password) },
  { label: "One number", test: (password: string) => /\d/.test(password) },
  {
    label: "One special character",
    test: (password: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  },
] as const

const resetSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[A-Z]/, "Password must include an uppercase letter.")
      .regex(/\d/, "Password must include a number.")
      .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, "Password must include a special character."),
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })

type ResetFormValues = z.infer<typeof resetSchema>

function PasswordStrength({ password }: { password: string }) {
  const passed = PASSWORD_REQUIREMENTS.filter((requirement) => requirement.test(password)).length
  const value = (passed / PASSWORD_REQUIREMENTS.length) * 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Password strength</span>
        <span className={value === 100 ? "font-medium text-green-600" : "text-muted-foreground"}>
          {passed}/{PASSWORD_REQUIREMENTS.length}
        </span>
      </div>
      <Progress value={value} />
      <ul className="grid gap-1">
        {PASSWORD_REQUIREMENTS.map((requirement) => {
          const isMet = requirement.test(password)

          return (
            <li key={requirement.label} className="flex items-center gap-1.5 text-xs">
              {isMet ? (
                <CheckCircle className="h-3.5 w-3.5 shrink-0 text-green-600" />
              ) : (
                <XCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className={isMet ? "text-green-700" : "text-muted-foreground"}>
                {requirement.label}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function StepReset() {
  const [showNewPassword, setShowNewPassword] = React.useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false)
  const newPasswordInputRef = React.useRef<HTMLInputElement | null>(null)
  const method = usePasswordResetStore((state) => state.method)
  const identifier = usePasswordResetStore((state) => state.identifier)
  const otp = usePasswordResetStore((state) => state.otp)
  const newPassword = usePasswordResetStore((state) => state.newPassword)
  const confirmPassword = usePasswordResetStore((state) => state.confirmPassword)
  const isLoading = usePasswordResetStore((state) => state.isLoading)
  const error = usePasswordResetStore((state) => state.error)
  const setNewPassword = usePasswordResetStore((state) => state.setNewPassword)
  const setConfirmPassword = usePasswordResetStore((state) => state.setConfirmPassword)
  const setStep = usePasswordResetStore((state) => state.setStep)
  const setLoading = usePasswordResetStore((state) => state.setLoading)
  const setError = usePasswordResetStore((state) => state.setError)
  const clearOtp = usePasswordResetStore((state) => state.clearOtp)

  const form = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword, confirmPassword },
    mode: "onChange",
  })
  const watchedPassword = form.watch("newPassword")

  React.useEffect(() => {
    newPasswordInputRef.current?.focus()
  }, [])

  async function onSubmit(values: ResetFormValues) {
    setLoading(true)
    setError(null)

    try {
      if (!method || !identifier || !otp) {
        setStep("verify-otp")
        setError("Invalid or expired OTP.")
        return
      }

      await verifyAndResetPassword({
        method,
        identifier,
        otp,
        newPassword: values.newPassword,
      })
      toast.success("Password updated successfully.")
      setStep("success")
    } catch (caughtError) {
      const message = caughtError instanceof Error
        ? caughtError.message
        : "Unable to update password. Please try again."

      if (caughtError instanceof ApiError && caughtError.status === 400) {
        clearOtp()
        setStep("verify-otp")
      }

      setError(message)
      toast.error(message)
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
                      ref={(element) => {
                        field.ref(element)
                        newPasswordInputRef.current = element
                      }}
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
                    onClick={() => setShowNewPassword((value) => !value)}
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
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <FormMessage aria-live="polite" />
              </FormItem>
            )}
          />
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Spinner /> : null}
            {isLoading ? "Updating password..." : "Update password"}
          </Button>
        </CardFooter>
      </form>
    </Form>
  )
}
