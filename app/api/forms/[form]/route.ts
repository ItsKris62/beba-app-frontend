type FormConfig = {
  defaultKey: string
  fileName: string
  keyEnv: string
  title: string
  urlEnv: string
}

const FORM_CONFIG = {
  "membership-application": {
    defaultKey: "forms/MEMBERSHIP APPLICATION FORM.pdf",
    fileName: "MEMBERSHIP APPLICATION FORM.pdf",
    keyEnv: "MEMBERSHIP_APPLICATION_FORM_KEY",
    title: "Membership Application Form",
    urlEnv: "MEMBERSHIP_APPLICATION_FORM_URL",
  },
  "loan-application": {
    defaultKey: "forms/LOAN APPLICATION FORM.pdf",
    fileName: "LOAN APPLICATION FORM.pdf",
    keyEnv: "LOAN_APPLICATION_FORM_KEY",
    title: "Loan Application Form",
    urlEnv: "LOAN_APPLICATION_FORM_URL",
  },
} satisfies Record<string, FormConfig>

function resolveFormUrl(config: FormConfig): string | null {
  const explicitUrl = process.env[config.urlEnv]?.trim()
  if (explicitUrl) return explicitUrl

  const publicBaseUrl = (process.env.R2_PUBLIC_URL ?? process.env.FORMS_R2_PUBLIC_URL)?.trim()
  if (!publicBaseUrl) return null

  const objectKey = (process.env[config.keyEnv]?.trim() || config.defaultKey).replace(/^\/+/, "")
  const baseUrl = publicBaseUrl.endsWith("/") ? publicBaseUrl : `${publicBaseUrl}/`
  return new URL(objectKey, baseUrl).toString()
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ form: string }> },
) {
  const { form } = await context.params
  const config = FORM_CONFIG[form as keyof typeof FORM_CONFIG]

  if (!config) {
    return Response.json({ error: "Unknown form" }, { status: 404 })
  }

  const sourceUrl = resolveFormUrl(config)
  if (!sourceUrl) {
    return Response.json(
      {
        error: `${config.title} download is not configured`,
      },
      { status: 503 },
    )
  }

  const upstream = await fetch(sourceUrl, { cache: "no-store" })
  if (!upstream.ok || !upstream.body) {
    return Response.json(
      {
        error: `${config.title} could not be downloaded`,
      },
      { status: upstream.status === 404 ? 404 : 502 },
    )
  }

  const headers = new Headers()
  headers.set("Content-Disposition", `attachment; filename="${config.fileName}"`)
  headers.set("Content-Type", upstream.headers.get("Content-Type") ?? "application/pdf")

  const contentLength = upstream.headers.get("Content-Length")
  if (contentLength) headers.set("Content-Length", contentLength)

  return new Response(upstream.body, {
    status: 200,
    headers,
  })
}
