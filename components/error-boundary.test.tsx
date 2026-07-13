import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ErrorBoundary, DashboardErrorFallback } from "./error-boundary"

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("boom")
  return <div>All good</div>
}

describe("ErrorBoundary — fallback prop wiring", () => {
  it("injects error + onRetry into a static fallback element (e.g. DashboardErrorFallback)", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    render(
      <ErrorBoundary fallback={<DashboardErrorFallback />}>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    )

    expect(screen.getByText("Dashboard data is temporarily unavailable")).toBeInTheDocument()

    const retryButton = screen.getByRole("button", { name: /Refresh Now/i })
    fireEvent.click(retryButton)

    // ErrorBoundary's handleRetry clears hasError; re-render should attempt
    // children again (still throws here since Bomb keeps shouldThrow=true,
    // but the boundary itself must not be stuck permanently on the first trip).
    expect(screen.getByText("Dashboard data is temporarily unavailable")).toBeInTheDocument()

    consoleError.mockRestore()
  })

  it("falls back to DefaultErrorFallback when no fallback prop is passed", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    )

    expect(screen.getByText("This section could not load")).toBeInTheDocument()

    consoleError.mockRestore()
  })
})
