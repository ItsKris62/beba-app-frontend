import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import AdminLoansPage from "./page"
import { adminApi, loansApi, type Loan } from "@/lib/api-client"

vi.mock("@/lib/auth-context", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth-context")>("@/lib/auth-context")
  return {
    ...actual,
    useAuth: vi.fn(),
  }
})

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client")
  return {
    ...actual,
    adminApi: { ...actual.adminApi, getLoans: vi.fn() },
    loansApi: { ...actual.loansApi, getLoan: vi.fn() },
  }
})

import { useAuth } from "@/lib/auth-context"

function makeLoan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: "loan-1",
    loanNumber: "LN-001",
    status: "PENDING_APPROVAL",
    purpose: "Business",
    principalAmount: "100000",
    interestRate: "0.12",
    processingFee: "1000",
    tenureMonths: 12,
    monthlyInstalment: "9000",
    outstandingBalance: "100000",
    totalRepaid: "0",
    appliedAt: "2026-01-01T00:00:00.000Z",
    approvedAt: null,
    disbursedAt: null,
    dueDate: null,
    notes: null,
    member: { memberNumber: "M001", user: { firstName: "Jane", lastName: "Member", email: "jane@example.com" } },
    loanProduct: { name: "Standard Loan", interestType: "FLAT" },
    ...overrides,
  }
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminLoansPage />
    </QueryClientProvider>,
  )
}

describe("Admin loans page — approval mode badge & self-approval guard", () => {
  beforeEach(() => {
    vi.mocked(adminApi.getLoans).mockReset()
    vi.mocked(loansApi.getLoan).mockReset()
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u1", email: "manager@example.com", firstName: "Man", lastName: "Ager", role: "MANAGER", tenantId: "t1", mustChangePassword: false },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      loginWithPin: vi.fn(),
      verifyLoginOtp: vi.fn(),
      logout: vi.fn(),
      updateUser: vi.fn(),
    })
  })

  it("shows a Single-approval badge below the KES 500,000 threshold", async () => {
    vi.mocked(adminApi.getLoans).mockResolvedValue({
      success: true,
      data: { data: [makeLoan({ principalAmount: "50000" })], meta: { page: 1, limit: 20, total: 1 } },
      error: null,
    })
    renderPage()
    expect(await screen.findByText("Single-approval", {}, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.queryByText("Dual sign-off required")).not.toBeInTheDocument()
  })

  it("shows a Dual sign-off required badge at or above the KES 500,000 threshold", async () => {
    vi.mocked(adminApi.getLoans).mockResolvedValue({
      success: true,
      data: { data: [makeLoan({ principalAmount: "750000" })], meta: { page: 1, limit: 20, total: 1 } },
      error: null,
    })
    renderPage()
    expect(await screen.findByText("Dual sign-off required", {}, { timeout: 5000 })).toBeInTheDocument()
  })

  it("disables the Approve action when the logged-in admin is also the loan's applicant", async () => {
    const loan = makeLoan({ member: { memberNumber: "M001", user: { firstName: "Man", lastName: "Ager", email: "manager@example.com" } } })
    vi.mocked(adminApi.getLoans).mockResolvedValue({
      success: true,
      data: { data: [loan], meta: { page: 1, limit: 20, total: 1 } },
      error: null,
    })
    vi.mocked(loansApi.getLoan).mockResolvedValue({ success: true, data: loan, error: null })

    renderPage()
    const approveButton = await screen.findByRole("button", { name: /Approve loan LN-001/i }, { timeout: 5000 })
    await waitFor(() => expect(approveButton).toBeDisabled(), { timeout: 5000 })
  })

  it("leaves the Approve action enabled when the applicant is a different person", async () => {
    const loan = makeLoan() // member email jane@example.com, logged-in admin is manager@example.com
    vi.mocked(adminApi.getLoans).mockResolvedValue({
      success: true,
      data: { data: [loan], meta: { page: 1, limit: 20, total: 1 } },
      error: null,
    })
    vi.mocked(loansApi.getLoan).mockResolvedValue({ success: true, data: loan, error: null })

    renderPage()
    const approveButton = await screen.findByRole("button", { name: /Approve loan LN-001/i }, { timeout: 5000 })
    await waitFor(() => expect(loansApi.getLoan).toHaveBeenCalled(), { timeout: 5000 })
    await waitFor(() => expect(approveButton).not.toBeDisabled(), { timeout: 5000 })
  })
})
