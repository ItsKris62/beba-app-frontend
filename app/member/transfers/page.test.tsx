import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import TransfersPage from "./page"
import { memberApi } from "@/lib/api-client"

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client")
  return {
    ...actual,
    memberApi: {
      ...actual.memberApi,
      getDashboard: vi.fn(),
    },
  }
})

describe("Transfers page", () => {
  beforeEach(() => {
    vi.mocked(memberApi.getDashboard).mockReset()
    vi.mocked(memberApi.getDashboard).mockResolvedValue({
      success: true,
      error: null,
      data: {
        member: {
          id: "m1",
          memberNumber: "M00123",
          name: "Test Member",
          email: "member@test.com",
          kycStatus: "APPROVED",
        },
        balances: { fosa: 5000, bosa: 1000, fosaAccountId: "acc-1", bosaAccountId: "acc-2" },
        activeLoans: [],
        recentTransactions: [],
        pendingGuarantorRequests: [],
      },
    })
  })

  it("shows the member-to-member transfer tab as not yet available, with no form to submit", async () => {
    render(<TransfersPage />)

    await waitFor(() => expect(memberApi.getDashboard).toHaveBeenCalledTimes(1))

    expect(screen.getByText(/not available yet/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Recipient Member Number/i)).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Send Money/i })).not.toBeInTheDocument()
  })

  it("never calls the global fetch directly for a transfer (no hand-rolled request)", async () => {
    const fetchSpy = vi.spyOn(global, "fetch")
    render(<TransfersPage />)
    await waitFor(() => expect(memberApi.getDashboard).toHaveBeenCalledTimes(1))
    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })
})
