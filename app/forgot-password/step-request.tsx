"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Phone } from "lucide-react"
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
import { Spinner } from "@/components/ui/spinner"
import { requestPasswordReset } from "@/lib/api/auth.service"
import { usePasswordResetStore } from "@/store/usePasswordResetStore"

const requestSchema = z.object({
  lastFiveDigits: z.string().regex(/^\d{5}$/, "Enter exactly 5 digits."),
})

type RequestFormValues = z.infer<typeof requestSchema>

export function StepRequest() {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const lastFiveDigits = usePasswordResetStore((state) => state.lastFiveDigits)
  const isLoading = usePasswordResetStore((state) => state.isLoading)
  const error = usePasswordResetStore((state) => state.error)
  const setField = usePasswordResetStore((state) => state.setField)
  const setStep = usePasswordResetStore((state) => state.setStep)
  const startTimer = usePasswordResetStore((state) => state.startTimer)
  const setLoading = usePasswordResetStore((state) => state.setLoading)
  const setError = usePasswordResetStore((state) => state.setError)

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { lastFiveDigits },
    mode: "onChange",
  })

  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function onSubmit(values: RequestFormValues) {
    setLoading(true)
    setError(null)

    try {
      await requestPasswordReset({ lastFiveDigits: values.lastFiveDigits })
      setField("lastFiveDigits", values.lastFiveDigits)
      setField("otp", "")
      setField("newPassword", "")
      setField("confirmPassword", "")
      startTimer()
      setStep("verify")
      toast.success("If an account exists, an OTP has been sent.")
    } catch (caughtError) {
      const message = caughtError instanceof Error
        ? caughtError.message
        : "Unable to request OTP. Please try again."
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error ? (
            <Alert variant="destructive" aria-live="polite">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <FormField
            control={form.control}
            name="lastFiveDigits"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last 5 digits of phone number</FormLabel>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <FormControl>
                    <Input
                      {...field}
                      ref={(element) => {
                        field.ref(element)
                        inputRef.current = element
                      }}
                      inputMode="numeric"
                      autoComplete="tel"
                      maxLength={5}
                      className="pl-9"
                      placeholder="12345"
                      disabled={isLoading}
                      onChange={(event) => {
                        const value = event.target.value.replace(/\D/g, "").slice(0, 5)
                        field.onChange(value)
                        setField("lastFiveDigits", value)
                      }}
                    />
                  </FormControl>
                </div>
                <FormMessage aria-live="polite" />
              </FormItem>
            )}
          />
        </CardContent>

        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Spinner /> : null}
            {isLoading ? "Sending OTP..." : "Send OTP"}
          </Button>
        </CardFooter>
      </form>
    </Form>
  )
}
