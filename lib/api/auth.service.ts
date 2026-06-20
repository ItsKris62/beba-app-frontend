import type { Method } from "@/store/usePasswordResetStore"

export interface PasswordResetRequestPayload {
  method: Method
  identifier: string
}

export interface PasswordResetVerifyPayload {
  method: Method
  identifier: string
  otp: string
  newPassword: string
}

export interface PasswordResetResponse {
  message: string
}

interface BackendErrorBody {
  error?: string
  message?: string
  details?: unknown[]
}

export class ApiError extends Error {
  status: number
  details?: unknown[]

  constructor(message: string, status: number, details?: unknown[]) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.details = details
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"

function getPasswordResetUrl(path: "/request" | "/verify"): string {
  const base = API_BASE.replace(/\/$/, "")
  const authPath = base.endsWith("/api")
    ? `/auth/password-reset${path}`
    : `/api/auth/password-reset${path}`

  return `${base}${authPath}`
}

function isBackendErrorBody(value: unknown): value is BackendErrorBody {
  return typeof value === "object" && value !== null
}

async function parseErrorBody(response: Response): Promise<BackendErrorBody> {
  const body = await response.json().catch(() => null)

  if (!isBackendErrorBody(body)) {
    return {}
  }

  return {
    error: typeof body.error === "string" ? body.error : undefined,
    message: typeof body.message === "string" ? body.message : undefined,
    details: Array.isArray(body.details) ? body.details : undefined,
  }
}

function mapHttpError(status: number, body: BackendErrorBody): ApiError {
  if (status === 429) {
    return new ApiError("Too many attempts. Please wait 15 minutes.", status, body.details)
  }

  if (status === 400) {
    return new ApiError("Invalid or expired OTP.", status, body.details)
  }

  if (status >= 500) {
    return new ApiError("Service temporarily unavailable.", status, body.details)
  }

  return new ApiError("Unable to complete request. Please try again.", status, body.details)
}

async function postPasswordReset<TPayload>(
  path: "/request" | "/verify",
  payload: TPayload,
): Promise<PasswordResetResponse> {
  let response: Response

  try {
    response = await fetch(getPasswordResetUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new ApiError("Network error. Please check your connection and try again.", 0)
  }

  if (!response.ok) {
    const body = await parseErrorBody(response)
    throw mapHttpError(response.status, body)
  }

  const body = (await response.json().catch(() => ({ message: "Request completed." }))) as unknown

  if (isBackendErrorBody(body) && typeof body.message === "string") {
    return { message: body.message }
  }

  return { message: "Request completed." }
}

export function requestPasswordReset(
  payload: PasswordResetRequestPayload,
): Promise<PasswordResetResponse> {
  return postPasswordReset("/request", payload)
}

export function verifyAndResetPassword(
  payload: PasswordResetVerifyPayload,
): Promise<PasswordResetResponse> {
  return postPasswordReset("/verify", payload)
}
