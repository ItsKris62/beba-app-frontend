"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { RefreshCw } from "lucide-react"
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { Spinner } from "@/components/ui/spinner"
import { requestPasswordReset } from "@/lib/api/auth.service"
import { usePasswordResetStore } from "@/store/usePasswordResetStore"

const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit OTP."),
})

type OtpFormValues = z.infer<typeof otpSchema>

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0")
  const seconds = (totalSeconds % 60).toString().padStart(2, "0")

  return `${minutes}:${seconds}`
}

export function StepVerify() {
  const lastFiveDigits = usePasswordResetStore((state) => state.lastFiveDigits)
  const otp = usePasswordResetStore((state) => state.otp)
  const timeRemaining = usePasswordResetStore((state) => state.timeRemaining)
  const isLoading = usePasswordResetStore((state) => state.isLoading)
  const error = usePasswordResetStore((state) => state.error)
  const setField = usePasswordResetStore((state) => state.setField)
  const setStep = usePasswordResetStore((state) => state.setStep)
  const startTimer = usePasswordResetStore((state) => state.startTimer)
  const setLoading = usePasswordResetStore((state) => state.setLoading)
  const setError = usePasswordResetStore((state) => state.setError)

  const form = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp },
    mode: "onChange",
  })

  async function resendOtp() {
    if (timeRemaining > 0) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      await requestPasswordReset({ lastFiveDigits })
      setField("otp", "")
      form.reset({ otp: "" })
      startTimer()
      toast.success("If an account exists, an OTP has been sent.")
    } catch (caughtError) {
      const message = caughtError instanceof Error
        ? caughtError.message
        : "Unable to resend OTP. Please try again."
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(values: OtpFormValues) {
    setField("otp", values.otp)
    setError(null)
    setStep("reset")
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
            <span className="text-muted-foreground">Code expires in </span>
            <span className="font-mono font-medium" aria-live="polite">
              {formatTime(timeRemaining)}
            </span>
          </div>

          <FormField
            control={form.control}
            name="otp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>6-digit OTP</FormLabel>
                <FormControl>
                  <InputOTP
                    maxLength={6}
                    value={field.value}
                    onChange={(value) => {
                      const digits = value.replace(/\D/g, "").slice(0, 6)
                      field.onChange(digits)
                      setField("otp", digits)
                    }}
                    disabled={isLoading}
                    autoFocus
                    containerClassName="justify-between"
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }).map((_, index) => (
                        <InputOTPSlot
                          key={index}
                          index={index}
                          className="h-11 w-11 text-base"
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </FormControl>
                <FormMessage aria-live="polite" />
              </FormItem>
            )}
          />
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isLoading || timeRemaining <= 0}>
            Continue
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isLoading || timeRemaining > 0}
            onClick={resendOtp}
          >
            {isLoading ? <Spinner /> : <RefreshCw className="h-4 w-4" />}
            Resend OTP
          </Button>
        </CardFooter>
      </form>
    </Form>
  )
}
