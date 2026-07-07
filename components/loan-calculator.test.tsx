import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { LoanCalculator } from "./loan-calculator"
import { loansApi } from "@/lib/api-client"

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client")
  return {
    ...actual,
    loansApi: {
      ...actual.loansApi,
      getPublicProducts: vi.fn(),
    },
  }
})

class ResizeObserverMock implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof window !== "undefined" && !("ResizeObserver" in window)) {
  Object.defineProperty(window, "ResizeObserver", {
    configurable: true,
    writable: true,
    value: ResizeObserverMock,
  })
}

const mockProduct = {
  id: "p1",
  name: "Jipange Loan",
  description: "Quick access loan for short-term needs",
  minAmount: "1000",
  maxAmount: "500000",
  interestRate: "0.12",
  interestType: "REDUCING_BALANCE",
  maxTenureMonths: 24,
  processingFeeRate: "0.01",
  minGuarantors: 1,
  maxGuarantors: 3,
  guarantorCoverageRatio: "1",
  gracePeriodMonths: 0,
  gracePeriodDays: 14,
  isActive: true,
}

describe("LoanCalculator", () => {
  beforeEach(() => {
    vi.mocked(loansApi.getPublicProducts).mockReset()
  })

  it("fetches from the public loan-products API and renders the returned product", async () => {
    vi.mocked(loansApi.getPublicProducts).mockResolvedValue({
      success: true,
      data: [mockProduct],
      error: null,
    })

    render(<LoanCalculator />)

    await waitFor(() => expect(loansApi.getPublicProducts).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByText(/Quick access loan/i)).toBeInTheDocument())
  })

  it("shows an empty state when no active products are returned", async () => {
    vi.mocked(loansApi.getPublicProducts).mockResolvedValue({
      success: true,
      data: [],
      error: null,
    })

    render(<LoanCalculator />)

    await waitFor(() => expect(screen.getByText(/No loan products available/i)).toBeInTheDocument())
  })
})
