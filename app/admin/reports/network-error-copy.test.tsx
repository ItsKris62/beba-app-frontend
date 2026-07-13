import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AdminReportsPage from "./page"
import { adminApi } from "@/lib/api-client"

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client")
  return {
    ...actual,
    adminApi: {
      ...actual.adminApi,
      getDashboardReports: vi.fn(),
    },
  }
})

// The real hook drives a ~59s exponential backoff via setTimeout — mocking it
// lets the "retries exhausted" branch be asserted deterministically instead
// of waiting on real timers.
vi.mock("@/lib/use-network-error-retry", () => ({
  useNetworkErrorAutoRetry: vi.fn(() => ({ attempt: 6, exhausted: true, retrying: false })),
}))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminReportsPage />
    </QueryClientProvider>,
  )
}

const NETWORK_ERROR_RESPONSE = {
  success: false as const,
  data: null,
  error: { code: "NETWORK_ERROR", message: "Network error – please check your connection" },
}

describe("Admin reports page — network-error-exhausted copy", () => {
  beforeEach(() => {
    vi.mocked(adminApi.getDashboardReports).mockReset()
    vi.mocked(adminApi.getDashboardReports).mockResolvedValue(NETWORK_ERROR_RESPONSE as never)
  })

  it("shows neutral connection-trouble copy once retries are exhausted, not the wake-up-from-idle copy", async () => {
    renderPage()

    expect(
      await screen.findByText("We're having trouble connecting to the server.", {}, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/This usually means it's still waking up from being idle/i),
    ).not.toBeInTheDocument()
  })
})
