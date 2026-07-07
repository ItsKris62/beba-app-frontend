import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { TermsSummary } from "./TermsSummary"

describe("TermsSummary", () => {
  it("renders the four terms in the required order: Interest Rate, Fees, Tenure, Total Repayable", () => {
    render(
      <TermsSummary
        principalAmount={100000}
        interestRate={0.12}
        interestType="FLAT"
        fees={1000}
        tenureMonths={12}
        totalRepayable={112000}
      />,
    )
    const labels = screen.getAllByRole("term").map((el) => el.textContent)
    expect(labels).toEqual(["Interest Rate", "Fees", "Tenure", "Total Repayable"])
  })

  it("shows accurate values and screen-reader labels for known figures", () => {
    render(
      <TermsSummary
        principalAmount={100000}
        interestRate={0.12}
        interestType="FLAT"
        fees={1000}
        tenureMonths={12}
        totalRepayable={112000}
      />,
    )
    expect(screen.getByText("12.0% p.a. (Flat)")).toBeInTheDocument()
    expect(screen.getByLabelText(/Total repayable:.*112,000/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Principal amount:.*100,000/)).toBeInTheDocument()
  })

  it("renders 'Not available' for fields that weren't supplied, instead of fabricating a value", () => {
    render(<TermsSummary principalAmount={25000} />)
    const notAvailable = screen.getAllByText("Not available")
    expect(notAvailable).toHaveLength(4)
  })
})
