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
import { authApi } from "@/lib/api-client"
import { usePasswordResetStore } from "@/store/usePasswordResetStore"
import { normalizeKenyanPhone, displayKenyanPhone } from "@/lib/utils"

const GENERIC_SUCCESS_MESSAGE = "If the phone number is registered, a PIN has been sent."

const requestSchema = z.object({
  phone: z.string().regex(/^\+254[17]\d{8}$/, "Enter a valid Kenyan phone number."),
})

type RequestFormValues = z.infer<typeof requestSchema>

export function StepRequest() {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const phone = usePasswordResetStore((state) => state.phone)
  const isLoading = usePasswordResetStore((state) => state.isLoading)
  const error = usePasswordResetStore((state) => state.error)
  const setPhone = usePasswordResetStore((state) => state.setPhone)
  const setPin = usePasswordResetStore((state) => state.setPin)
  const setNewPassword = usePasswordResetStore((state) => state.setNewPassword)
  const setConfirmPassword = usePasswordResetStore((state) => state.setConfirmPassword)
  const setStep = usePasswordResetStore((state) => state.setStep)
  const startTimer = usePasswordResetStore((state) => state.startTimer)
  const setLoading = usePasswordResetStore((state) => state.setLoading)
  const setError = usePasswordResetStore((state) => state.setError)

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { phone: phone || "+254" },
    mode: "onChange",
  })

  async function onSubmit(values: RequestFormValues) {
    setLoading(true)
    setError(null)

    try {
      const res = await authApi.requestPasswordReset(values.phone)
      if (!res.success && res.error?.code === "HTTP_429") {
        setError("Too many attempts. Please try again in a few minutes.")
        return
      }
      setPhone(values.phone)
      setPin("")
      setNewPassword("")
      setConfirmPassword("")
      startTimer()
      setStep("confirm")
      toast.success(GENERIC_SUCCESS_MESSAGE)
    } catch {
      const message = "Unable to request a PIN. Please try again."
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
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone number</FormLabel>
                <div className="flex rounded-md border bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring">
                  <span className="inline-flex items-center border-r px-3 text-sm font-medium text-muted-foreground">
                    <Phone className="mr-1.5 h-3.5 w-3.5" />
                    +254
                  </span>
                  <FormControl>
                    <Input
                      ref={(element) => {
                        field.ref(element)
                        inputRef.current = element
                      }}
                      value={displayKenyanPhone(field.value)}
                      inputMode="numeric"
                      autoComplete="tel-national"
                      maxLength={9}
                      className="border-0 shadow-none focus-visible:ring-0"
                      placeholder="712345678"
                      disabled={isLoading}
                      onBlur={field.onBlur}
                      onChange={(event) => {
                        const normalized = normalizeKenyanPhone(event.target.value)
                        field.onChange(normalized)
                        setPhone(normalized)
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
            {isLoading ? "Sending PIN..." : "Send PIN"}
          </Button>
        </CardFooter>
      </form>
    </Form>
  )
}
