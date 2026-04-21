"use client"

// Loan Product Types and Configuration
export type TenureUnit = "days" | "weeks" | "months"

export interface LoanProduct {
  id: string
  name: string
  description: string
  interestRate: number // As percentage (e.g., 12 for 12%)
  interestType: "flat" | "reducing" // flat = one-time, reducing = per month
  maxAmount: number | null // null means based on multiplier
  maxMultiplier: number | null // Multiplier of BOSA savings (e.g., 3 means 3x)
  minTenure: number
  maxTenure: number
  tenureUnit: TenureUnit
  guarantorsRequired: number
  processingFee: number // As percentage
  insuranceFee: number // As percentage
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// Default loan products
export const defaultLoanProducts: LoanProduct[] = [
  {
    id: "development",
    name: "Development Loan",
    description: "For asset acquisition, business expansion, and long-term investments",
    interestRate: 1,
    interestType: "reducing",
    maxAmount: null,
    maxMultiplier: 3,
    minTenure: 1,
    maxTenure: 48,
    tenureUnit: "months",
    guarantorsRequired: 3,
    processingFee: 1,
    insuranceFee: 0.5,
    isActive: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
  {
    id: "jipange",
    name: "Jipange Loan",
    description: "Quick access loan for short-term financial needs, emergencies, and urgent expenses",
    interestRate: 12,
    interestType: "flat",
    maxAmount: 5000,
    maxMultiplier: null,
    minTenure: 1,
    maxTenure: 2,
    tenureUnit: "weeks",
    guarantorsRequired: 3,
    processingFee: 0,
    insuranceFee: 0,
    isActive: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
]

// Storage key for localStorage
const STORAGE_KEY = "kcboda_loan_products"

// Get loan products from storage or return defaults
export function getLoanProducts(): LoanProduct[] {
  if (typeof window === "undefined") {
    return defaultLoanProducts
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error("Error reading loan products from storage:", error)
  }
  
  return defaultLoanProducts
}

// Save loan products to storage
export function saveLoanProducts(products: LoanProduct[]): void {
  if (typeof window === "undefined") return
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
  } catch (error) {
    console.error("Error saving loan products to storage:", error)
  }
}

// Get active loan products only
export function getActiveLoanProducts(): LoanProduct[] {
  return getLoanProducts().filter((p) => p.isActive)
}

// Get a single loan product by ID
export function getLoanProductById(id: string): LoanProduct | undefined {
  return getLoanProducts().find((p) => p.id === id)
}

// Create a new loan product
export function createLoanProduct(product: Omit<LoanProduct, "id" | "createdAt" | "updatedAt">): LoanProduct {
  const products = getLoanProducts()
  const newProduct: LoanProduct = {
    ...product,
    id: `loan_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  products.push(newProduct)
  saveLoanProducts(products)
  return newProduct
}

// Update a loan product
export function updateLoanProduct(id: string, updates: Partial<LoanProduct>): LoanProduct | null {
  const products = getLoanProducts()
  const index = products.findIndex((p) => p.id === id)
  
  if (index === -1) return null
  
  products[index] = {
    ...products[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  
  saveLoanProducts(products)
  return products[index]
}

// Delete a loan product
export function deleteLoanProduct(id: string): boolean {
  const products = getLoanProducts()
  const filtered = products.filter((p) => p.id !== id)
  
  if (filtered.length === products.length) return false
  
  saveLoanProducts(filtered)
  return true
}

// Reset to default products
export function resetLoanProducts(): void {
  saveLoanProducts(defaultLoanProducts)
}

// Helper: Convert tenure to days for calculations
export function tenureToDays(tenure: number, unit: TenureUnit): number {
  switch (unit) {
    case "days":
      return tenure
    case "weeks":
      return tenure * 7
    case "months":
      return tenure * 30
    default:
      return tenure
  }
}

// Helper: Format tenure display
export function formatTenure(tenure: number, unit: TenureUnit): string {
  const unitLabels: Record<TenureUnit, { singular: string; plural: string }> = {
    days: { singular: "day", plural: "days" },
    weeks: { singular: "week", plural: "weeks" },
    months: { singular: "month", plural: "months" },
  }
  
  const label = tenure === 1 ? unitLabels[unit].singular : unitLabels[unit].plural
  return `${tenure} ${label}`
}

// Helper: Calculate loan repayment
export function calculateLoanRepayment(
  principal: number,
  interestRate: number,
  interestType: "flat" | "reducing",
  tenure: number,
  tenureUnit: TenureUnit
): {
  totalInterest: number
  totalRepayment: number
  monthlyPayment: number | null
  weeklyPayment: number | null
  dailyPayment: number | null
} {
  let totalInterest: number
  let totalRepayment: number
  
  if (interestType === "flat") {
    // Flat rate: interest is calculated once on principal
    totalInterest = principal * (interestRate / 100)
    totalRepayment = principal + totalInterest
  } else {
    // Reducing balance: convert to months for calculation
    const months = tenureUnit === "months" ? tenure : tenureUnit === "weeks" ? tenure / 4.33 : tenure / 30
    const monthlyRate = interestRate / 100
    
    if (monthlyRate === 0 || months === 0) {
      totalInterest = 0
      totalRepayment = principal
    } else {
      // PMT formula for reducing balance
      const monthlyPayment = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
      totalRepayment = monthlyPayment * months
      totalInterest = totalRepayment - principal
    }
  }
  
  // Calculate payments based on tenure unit
  let monthlyPayment: number | null = null
  let weeklyPayment: number | null = null
  let dailyPayment: number | null = null
  
  switch (tenureUnit) {
    case "days":
      dailyPayment = totalRepayment / tenure
      break
    case "weeks":
      weeklyPayment = totalRepayment / tenure
      break
    case "months":
      monthlyPayment = totalRepayment / tenure
      break
  }
  
  return {
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalRepayment: Math.round(totalRepayment * 100) / 100,
    monthlyPayment: monthlyPayment ? Math.round(monthlyPayment * 100) / 100 : null,
    weeklyPayment: weeklyPayment ? Math.round(weeklyPayment * 100) / 100 : null,
    dailyPayment: dailyPayment ? Math.round(dailyPayment * 100) / 100 : null,
  }
}
