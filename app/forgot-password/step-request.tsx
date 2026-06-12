"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Mail, MessageSquareText } from "lucide-react"
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
import type { Method } from "@/store/usePasswordResetStore"
import { cn } from "@/lib/utils"

const GENERIC_SUCCESS_MESSAGE = "If an account exists, an OTP has been sent."

const requestSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("EMAIL"),
    identifier: z.string().email("Enter a valid email address.").max(254),
  }),
  z.object({
    method: z.literal("SMS"),
    identifier: z
      .string()
      .regex(/^\+254[17]\d{8}$/, "Enter a valid Kenyan phone number."),
  }),
])

type RequestFormValues = z.infer<typeof requestSchema>

function normalizeKenyanPhone(value: string): string {
  const digits = value.replace(/\D/g, "")

  if (digits.startsWith("254")) {
    return `+${digits.slice(0, 12)}`
  }

  if (digits.startsWith("0")) {
    return `+254${digits.slice(1, 10)}`
  }

  return `+254${digits.slice(0, 9)}`
}

function displayPhoneValue(identifier: string): string {
  return identifier.replace(/^\+254/, "")
}

function MethodButton({
  method,
  active,
  onClick,
}: {
  method: Method
  active: boolean
  onClick: () => void
}) {
  const isEmail = method === "EMAIL"
  const Icon = isEmail ? Mail : MessageSquareText

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-24 flex-1 items-start gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "border-primary bg-primary/5" : "bg-background hover:bg-muted/50",
      )}
      aria-pressed={active}
    >
      <Icon className={cn("mt-0.5 h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
      <span className="grid gap-1">
        <span className="font-medium">{isEmail ? "Send via Email" : "Send via SMS"}</span>
        <span className="text-xs leading-5 text-muted-foreground">
          {isEmail ? "Use your registered email address." : "Use your registered Kenyan phone."}
        </span>
      </span>
    </button>
  )
}

export function StepRequest() {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const method = usePasswordResetStore((state) => state.method)
  const identifier = usePasswordResetStore((state) => state.identifier)
  const isLoading = usePasswordResetStore((state) => state.isLoading)
  const error = usePasswordResetStore((state) => state.error)
  const setMethod = usePasswordResetStore((state) => state.setMethod)
  const setIdentifier = usePasswordResetStore((state) => state.setIdentifier)
  const setOtp = usePasswordResetStore((state) => state.setOtp)
  const setNewPassword = usePasswordResetStore((state) => state.setNewPassword)
  const setConfirmPassword = usePasswordResetStore((state) => state.setConfirmPassword)
  const setStep = usePasswordResetStore((state) => state.setStep)
  const startTimer = usePasswordResetStore((state) => state.startTimer)
  const setLoading = usePasswordResetStore((state) => state.setLoading)
  const setError = usePasswordResetStore((state) => state.setError)

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      method: method ?? "EMAIL",
      identifier: method === "SMS" ? identifier || "+254" : identifier,
    } as RequestFormValues,
    mode: "onChange",
  })

  const selectedMethod = form.watch("method")

  React.useEffect(() => {
    if (method) {
      inputRef.current?.focus()
    }
  }, [method])

  function chooseMethod(nextMethod: Method) {
    setMethod(nextMethod)
    form.reset({
      method: nextMethod,
      identifier: nextMethod === "SMS" ? "+254" : "",
    } as RequestFormValues)
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  async function onSubmit(values: RequestFormValues) {
    const normalizedIdentifier =
      values.method === "EMAIL" ? values.identifier.trim().toLowerCase() : values.identifier

    setLoading(true)
    setError(null)

    try {
      await requestPasswordReset({
        method: values.method,
        identifier: normalizedIdentifier,
      })
      setIdentifier(normalizedIdentifier)
      setOtp("")
      setNewPassword("")
      setConfirmPassword("")
      startTimer()
      setStep("verify-otp")
      toast.success(GENERIC_SUCCESS_MESSAGE)
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
        <CardContent className="space-y-5">
          {error ? (
            <Alert variant="destructive" aria-live="polite">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <MethodButton
              method="EMAIL"
              active={selectedMethod === "EMAIL"}
              onClick={() => chooseMethod("EMAIL")}
            />
            <MethodButton
              method="SMS"
              active={selectedMethod === "SMS"}
              onClick={() => chooseMethod("SMS")}
            />
          </div>

          <FormField
            control={form.control}
            name="identifier"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{selectedMethod === "SMS" ? "Phone number" : "Email address"}</FormLabel>
                {selectedMethod === "SMS" ? (
                  <div className="flex rounded-md border bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring">
                    <span className="inline-flex items-center border-r px-3 text-sm font-medium text-muted-foreground">
                      +254
                    </span>
                    <FormControl>
                      <Input
                        ref={(element) => {
                          field.ref(element)
                          inputRef.current = element
                        }}
                        value={displayPhoneValue(field.value)}
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
                          setIdentifier(normalized)
                        }}
                      />
                    </FormControl>
                  </div>
                ) : (
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input
                        {...field}
                        ref={(element) => {
                          field.ref(element)
                          inputRef.current = element
                        }}
                        type="email"
                        autoComplete="email"
                        className="pl-9"
                        placeholder="you@example.com"
                        disabled={isLoading}
                        onChange={(event) => {
                          field.onChange(event)
                          setIdentifier(event.target.value)
                        }}
                      />
                    </FormControl>
                  </div>
                )}
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
