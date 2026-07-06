export interface LoanRepaymentCalculation {
  monthlyInstalment: number
  totalInterest: number
  totalRepayment: number
}

/**
 * Mirrors LoanApplicationService.calculateInstalment on the backend so every
 * frontend preview (marketing calculator, apply-loan form) matches the real
 * amortization the member would get. interestRate is an annual fraction
 * (e.g. 0.12 for 12% p.a.).
 */
export function calculateLoanRepayment(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  interestType: string,
): LoanRepaymentCalculation {
  if (tenureMonths <= 0) {
    return { monthlyInstalment: 0, totalInterest: 0, totalRepayment: principal }
  }

  let monthlyInstalment: number
  if (interestType === "FLAT") {
    const totalInterest = principal * annualRate * (tenureMonths / 12)
    monthlyInstalment = (principal + totalInterest) / tenureMonths
  } else {
    const monthlyRate = annualRate / 12
    if (monthlyRate === 0) {
      monthlyInstalment = principal / tenureMonths
    } else {
      const pow = Math.pow(1 + monthlyRate, tenureMonths)
      monthlyInstalment = (principal * monthlyRate * pow) / (pow - 1)
    }
  }

  const totalRepayment = monthlyInstalment * tenureMonths
  return {
    monthlyInstalment: Math.round(monthlyInstalment * 100) / 100,
    totalInterest: Math.round((totalRepayment - principal) * 100) / 100,
    totalRepayment: Math.round(totalRepayment * 100) / 100,
  }
}
