import { formatCurrency } from "@/lib/api-client"
import { cn } from "@/lib/utils"

export interface TermsSummaryProps {
  /** Shown as context above the four standardized rows, not part of the strict order itself. */
  principalAmount?: number
  /** Annual rate as a fraction, e.g. 0.12 for 12% p.a. */
  interestRate?: number
  interestType?: "FLAT" | "REDUCING_BALANCE" | string
  fees?: number
  tenureMonths?: number
  totalRepayable?: number
  className?: string
}

const INTEREST_TYPE_LABEL: Record<string, string> = {
  FLAT: "Flat",
  REDUCING_BALANCE: "Reducing balance",
}

/**
 * Standardized SASRA/CBK-style terms display: Interest Rate/APR, Fees,
 * Tenure, Total Repayable, always in that order. Used identically in the
 * loan wizard's review step and the guarantor consent screen so a member and
 * their guarantor see the same numbers presented the same way — any field
 * that isn't available in a given context (e.g. the guarantor request feed
 * doesn't carry interest/tenure/fee data) renders as "Not available" rather
 * than a fabricated or guessed value.
 */
export function TermsSummary({
  principalAmount,
  interestRate,
  interestType,
  fees,
  tenureMonths,
  totalRepayable,
  className,
}: TermsSummaryProps) {
  const rows: Array<{ label: string; display: string; srLabel: string }> = [
    {
      label: "Interest Rate",
      display:
        interestRate != null
          ? `${(interestRate * 100).toFixed(1)}% p.a.${interestType ? ` (${INTEREST_TYPE_LABEL[interestType] ?? interestType})` : ""}`
          : "Not available",
      srLabel:
        interestRate != null
          ? `Interest rate: ${(interestRate * 100).toFixed(1)} percent per year${interestType ? `, ${INTEREST_TYPE_LABEL[interestType] ?? interestType}` : ""}`
          : "Interest rate not available",
    },
    {
      label: "Fees",
      display: fees != null ? formatCurrency(fees) : "Not available",
      srLabel: fees != null ? `Fees: ${formatCurrency(fees)} Kenyan Shillings` : "Fees not available",
    },
    {
      label: "Tenure",
      display: tenureMonths != null ? `${tenureMonths} month${tenureMonths === 1 ? "" : "s"}` : "Not available",
      srLabel: tenureMonths != null ? `Tenure: ${tenureMonths} months` : "Tenure not available",
    },
    {
      label: "Total Repayable",
      display: totalRepayable != null ? formatCurrency(totalRepayable) : "Not available",
      srLabel: totalRepayable != null ? `Total repayable: ${formatCurrency(totalRepayable)} Kenyan Shillings` : "Total repayable not available",
    },
  ]

  return (
    <div className={cn("rounded-lg border", className)} aria-label="Loan terms summary">
      {principalAmount != null && (
        <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2">
          <span className="text-sm font-medium">Principal Amount</span>
          <span className="font-semibold" aria-label={`Principal amount: ${formatCurrency(principalAmount)} Kenyan Shillings`}>
            {formatCurrency(principalAmount)}
          </span>
        </div>
      )}
      <dl className="divide-y">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between px-4 py-2 text-sm">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="font-medium" aria-label={row.srLabel}>{row.display}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
