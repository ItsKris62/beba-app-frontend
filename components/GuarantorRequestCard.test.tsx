import * as React from "react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { GuarantorRequestCard } from "./GuarantorRequestCard"
import { memberApi, type GuarantorRequest } from "@/lib/api-client"

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client")
  return {
    ...actual,
    memberApi: {
      ...actual.memberApi,
      respondToGuarantor: vi.fn(),
    },
  }
})

type ObserverCallback = (entries: Array<{ isIntersecting: boolean }>) => void

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []
  callback: ObserverCallback
  constructor(callback: ObserverCallback) {
    this.callback = callback
    MockIntersectionObserver.instances.push(this)
  }
  observe() {}
  disconnect() {}
  unobserve() {}
}

const request: GuarantorRequest = {
  loanId: "loan-1",
  loanNumber: "LN-001",
  applicantName: "Jane Applicant",
  amount: 100000,
  guaranteedAmount: 25000,
  status: "PENDING",
  purpose: "School fees",
}

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <GuarantorRequestCard request={request} onSettled={() => {}} />
    </QueryClientProvider>,
  )
}

describe("GuarantorRequestCard — informed consent gating", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = []
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver as unknown as typeof IntersectionObserver)
    vi.mocked(memberApi.respondToGuarantor).mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("keeps the consent checkbox disabled until the disclosure is scrolled to the end", async () => {
    renderCard()
    fireEvent.click(screen.getByRole("button", { name: /^Accept$/ }))

    const checkbox = await screen.findByRole("checkbox")
    expect(checkbox).toBeDisabled()

    const observer = MockIntersectionObserver.instances[0]
    observer.callback([{ isIntersecting: true }])

    await waitFor(() => expect(checkbox).not.toBeDisabled())
  })

  it("keeps Accept-and-lock-funds disabled until the checkbox is checked, even after scrolling", async () => {
    renderCard()
    fireEvent.click(screen.getByRole("button", { name: /^Accept$/ }))

    const acceptAndLock = await screen.findByRole("button", { name: /Accept and lock funds/i })
    expect(acceptAndLock).toBeDisabled()

    MockIntersectionObserver.instances[0].callback([{ isIntersecting: true }])
    const checkbox = await screen.findByRole("checkbox")
    await waitFor(() => expect(checkbox).not.toBeDisabled())
    expect(acceptAndLock).toBeDisabled()

    fireEvent.click(checkbox)
    await waitFor(() => expect(acceptAndLock).not.toBeDisabled())
  })

  it("submits the same idempotency key even if respondToGuarantor is called more than once", async () => {
    vi.mocked(memberApi.respondToGuarantor).mockResolvedValue({
      success: true,
      data: { loanId: "loan-1", memberId: "m1", status: "ACCEPTED" },
      error: null,
    })
    renderCard()
    fireEvent.click(screen.getByRole("button", { name: /^Accept$/ }))
    act(() => { MockIntersectionObserver.instances[0].callback([{ isIntersecting: true }]) })
    const checkbox = await screen.findByRole("checkbox")
    await waitFor(() => expect(checkbox).not.toBeDisabled())
    await act(async () => { fireEvent.click(checkbox) })

    const acceptAndLock = await screen.findByRole("button", { name: /Accept and lock funds/i })
    await waitFor(() => expect(acceptAndLock).not.toBeDisabled())
    await act(async () => { fireEvent.click(acceptAndLock) })

    await waitFor(() => expect(memberApi.respondToGuarantor).toHaveBeenCalledTimes(1))
    const [, action, , digitalAcknowledgment, firstKey] = vi.mocked(memberApi.respondToGuarantor).mock.calls[0]
    expect(action).toBe("ACCEPT")
    expect(digitalAcknowledgment).toBe(true)
    expect(typeof firstKey).toBe("string")
    expect((firstKey as string).length).toBeGreaterThan(0)
  })

  it("sends digitalAcknowledgment=true only on ACCEPT, never on DECLINE", async () => {
    vi.mocked(memberApi.respondToGuarantor).mockResolvedValue({
      success: true,
      data: { loanId: "loan-1", memberId: "m1", status: "DECLINED" },
      error: null,
    })
    renderCard()
    fireEvent.click(screen.getByRole("button", { name: /^Decline$/ }))
    const dialog = await screen.findByRole("alertdialog")
    fireEvent.click(within(dialog).getByRole("button", { name: /^Decline$/ }))

    await waitFor(() => expect(memberApi.respondToGuarantor).toHaveBeenCalledTimes(1))
    const [, action, , digitalAcknowledgment] = vi.mocked(memberApi.respondToGuarantor).mock.calls[0]
    expect(action).toBe("DECLINE")
    expect(digitalAcknowledgment).toBe(false)
  })
})
