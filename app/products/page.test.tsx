import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import ProductsPage from "./page"
import { loansApi } from "@/lib/api-client"

const navigationMock = vi.hoisted(() => ({
  searchParams: new URLSearchParams("tab=loans"),
}))

vi.mock("next/navigation", () => ({
  useSearchParams: () => navigationMock.searchParams,
  usePathname: () => "/products",
}))

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
  interestRate: "0.06",
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

describe("Public products page", () => {
  beforeEach(() => {
    vi.mocked(loansApi.getPublicProducts).mockReset()
    navigationMock.searchParams = new URLSearchParams("tab=loans")
  })

  it("fetches loan products from the real public API (not the deleted localStorage module)", async () => {
    vi.mocked(loansApi.getPublicProducts).mockResolvedValue({
      success: true,
      data: [mockProduct],
      error: null,
    })

    render(<ProductsPage />)

    await waitFor(() => expect(loansApi.getPublicProducts).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getAllByText("Jipange Loan").length).toBeGreaterThan(0))
    expect(screen.getAllByText(/KES 500,000/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/6.0% p.a. reducing/).length).toBeGreaterThan(0)
  })

  it("links savings account actions to membership", async () => {
    navigationMock.searchParams = new URLSearchParams("tab=savings")
    vi.mocked(loansApi.getPublicProducts).mockResolvedValue({
      success: true,
      data: [],
      error: null,
    })

    render(<ProductsPage />)

    const links = screen.getAllByRole("link", { name: "Open Account" })
    expect(links).toHaveLength(3)
    links.forEach((link) => expect(link).toHaveAttribute("href", "/membership"))
  })

  it("renders gracefully when the API returns no active products", async () => {
    vi.mocked(loansApi.getPublicProducts).mockResolvedValue({
      success: true,
      data: [],
      error: null,
    })

    render(<ProductsPage />)

    await waitFor(() => expect(loansApi.getPublicProducts).toHaveBeenCalledTimes(1))
    expect(screen.getAllByText(/Loan Products/).length).toBeGreaterThan(0)
  })
})
