import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AdminDashboardPage from "./page"
import { adminApi } from "@/lib/api-client"

vi.mock("@/lib/auth-context", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth-context")>("@/lib/auth-context")
  return {
    ...actual,
    useAuth: vi.fn(() => ({
      user: { id: "u1", email: "manager@example.com", firstName: "Man", lastName: "Ager", role: "MANAGER", tenantId: "t1", mustChangePassword: false },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      loginWithPin: vi.fn(),
      verifyLoginOtp: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    })),
  }
})

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client")
  return {
    ...actual,
    adminApi: {
      ...actual.adminApi,
      getDashboardStats: vi.fn(),
      getDashboardReports: vi.fn(),
      getAllTickets: vi.fn(),
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
      <AdminDashboardPage />
    </QueryClientProvider>,
  )
}

const NETWORK_ERROR_RESPONSE = {
  success: false as const,
  data: null,
  error: { code: "NETWORK_ERROR", message: "Network error – please check your connection" },
}

describe("Admin dashboard page — network-error-exhausted copy", () => {
  beforeEach(() => {
    vi.mocked(adminApi.getDashboardStats).mockReset()
    vi.mocked(adminApi.getDashboardReports).mockReset()
    vi.mocked(adminApi.getAllTickets).mockReset()
    vi.mocked(adminApi.getDashboardStats).mockResolvedValue(NETWORK_ERROR_RESPONSE as never)
    vi.mocked(adminApi.getDashboardReports).mockResolvedValue(NETWORK_ERROR_RESPONSE as never)
    vi.mocked(adminApi.getAllTickets).mockResolvedValue({ success: true, data: [], error: null })
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
