"use client"

import * as React from "react"
import { Calculator, Info, TrendingUp, Calendar, Percent, Shield, Users } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { loansApi, type LoanProduct } from "@/lib/api-client"

interface LoanCalculatorProps {
  className?: string
  defaultProductId?: string
}

/**
 * Mirrors LoanApplicationService.calculateInstalment on the backend so the
 * marketing-site preview matches the real amortization the member would get.
 * interestRate is an annual fraction (e.g. 0.12 for 12% p.a.).
 */
function calculateRepayment(
  principal: number,
  annualRate: number,
  tenureMonths: number,
  interestType: string,
): { monthlyInstalment: number; totalInterest: number; totalRepayment: number } {
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

export function LoanCalculator({ className, defaultProductId }: LoanCalculatorProps) {
  const [products, setProducts] = React.useState<LoanProduct[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedProductId, setSelectedProductId] = React.useState<string>("")
  const [loanAmount, setLoanAmount] = React.useState<number>(100000)
  const [tenure, setTenure] = React.useState<number>(12)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    loansApi.getPublicProducts().then((result) => {
      if (cancelled) return
      const activeProducts = result.success ? result.data ?? [] : []
      setProducts(activeProducts)
      setLoading(false)

      if (activeProducts.length > 0) {
        const defaultProduct = defaultProductId
          ? activeProducts.find((p) => p.id === defaultProductId) || activeProducts[0]
          : activeProducts[0]
        setSelectedProductId(defaultProduct.id)
        setLoanAmount(Math.min(100000, Number(defaultProduct.maxAmount)))
        setTenure(Math.min(12, defaultProduct.maxTenureMonths))
      }
    })
    return () => {
      cancelled = true
    }
  }, [defaultProductId])

  const selectedProduct = products.find((p) => p.id === selectedProductId)
  const minAmount = selectedProduct ? Number(selectedProduct.minAmount) : 10000
  const maxAmount = selectedProduct ? Number(selectedProduct.maxAmount) : 1000000
  const minTenure = 1
  const maxTenure = selectedProduct?.maxTenureMonths ?? 60
  const interestRatePercent = selectedProduct ? Number(selectedProduct.interestRate) * 100 : 0
  const processingFeePercent = selectedProduct ? Number(selectedProduct.processingFeeRate) * 100 : 0
  const isFlat = selectedProduct?.interestType === "FLAT"

  // Clamp amount/tenure whenever the selected product changes
  React.useEffect(() => {
    if (!selectedProduct) return
    setTenure((current) => Math.max(minTenure, Math.min(current, maxTenure)))
    setLoanAmount((current) => Math.max(minAmount, Math.min(current, maxAmount)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId])

  const calculation = React.useMemo(() => {
    if (!selectedProduct) return null
    return calculateRepayment(loanAmount, Number(selectedProduct.interestRate), tenure, selectedProduct.interestType)
  }, [selectedProduct, loanAmount, tenure])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading calculator...</div>
        </CardContent>
      </Card>
    )
  }

  if (products.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center text-muted-foreground">
            <Calculator className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No loan products available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Loan Calculator
        </CardTitle>
        <CardDescription>
          Calculate your loan repayment based on product parameters
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Product Selection */}
        <div className="space-y-2">
          <Label htmlFor="product">Select Loan Product</Label>
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger id="product">
              <SelectValue placeholder="Select a product" />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  <div className="flex items-center gap-2">
                    <span>{product.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {(Number(product.interestRate) * 100).toFixed(1)}%{" "}
                      {product.interestType === "FLAT" ? "flat" : "p.a. reducing"}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedProduct?.description && (
            <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>
          )}
        </div>

        {selectedProduct && (
          <>
            {/* Product Info Badges */}
            <div className="flex flex-wrap gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="gap-1">
                      <Percent className="h-3 w-3" />
                      {interestRatePercent.toFixed(1)}% {isFlat ? "flat" : "p.a. reducing"}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isFlat
                      ? "One-time interest on principal"
                      : "Annual interest on reducing balance, amortized monthly"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="gap-1">
                      <Calendar className="h-3 w-3" />
                      {minTenure} - {maxTenure} months
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Allowed repayment period</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="gap-1">
                      <Users className="h-3 w-3" />
                      {selectedProduct.minGuarantors}
                      {selectedProduct.maxGuarantors > selectedProduct.minGuarantors
                        ? `-${selectedProduct.maxGuarantors}`
                        : ""}{" "}
                      guarantor{selectedProduct.maxGuarantors !== 1 ? "s" : ""}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Required number of guarantors</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {processingFeePercent > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="gap-1">
                        <Shield className="h-3 w-3" />
                        {processingFeePercent.toFixed(1)}% processing fee
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>Deducted from disbursement</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>

            {/* Loan Amount Input */}
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="amount">Loan Amount</Label>
                  <span className="text-sm font-medium">{formatCurrency(loanAmount)}</span>
                </div>
                <Input
                  id="amount"
                  type="number"
                  min={minAmount}
                  max={maxAmount}
                  step={1000}
                  value={loanAmount}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0
                    setLoanAmount(Math.max(minAmount, Math.min(value, maxAmount)))
                  }}
                  className="font-mono"
                />
                <Slider
                  value={[loanAmount]}
                  onValueChange={([value]) => setLoanAmount(value)}
                  min={minAmount}
                  max={maxAmount}
                  step={1000}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatCurrency(minAmount)}</span>
                  <span>{formatCurrency(maxAmount)}</span>
                </div>
              </div>

              {/* Tenure Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tenure">Repayment Period (months)</Label>
                  <span className="text-sm font-medium">{tenure} month{tenure !== 1 ? "s" : ""}</span>
                </div>
                <Input
                  id="tenure"
                  type="number"
                  min={minTenure}
                  max={maxTenure}
                  value={tenure}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || minTenure
                    setTenure(Math.max(minTenure, Math.min(value, maxTenure)))
                  }}
                  className="font-mono"
                />
                <Slider
                  value={[tenure]}
                  onValueChange={([value]) => setTenure(value)}
                  min={minTenure}
                  max={maxTenure}
                  step={1}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{minTenure} month</span>
                  <span>{maxTenure} months</span>
                </div>
              </div>
            </div>

            {/* Calculation Results */}
            {calculation && (
              <div className="rounded-xl bg-muted/50 p-4 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Loan Summary
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Principal Amount</p>
                    <p className="text-lg font-semibold">{formatCurrency(loanAmount)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Total Interest</p>
                    <p className="text-lg font-semibold text-amber-600">
                      {formatCurrency(calculation.totalInterest)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Monthly Payment</p>
                    <p className="text-lg font-semibold text-primary">
                      {formatCurrency(calculation.monthlyInstalment)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Total Repayment</p>
                    <p className="text-lg font-semibold">{formatCurrency(calculation.totalRepayment)}</p>
                  </div>
                </div>

                {/* Fees Breakdown */}
                {processingFeePercent > 0 && (
                  <div className="pt-3 border-t space-y-2">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Additional fees (deducted from disbursement)
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Processing Fee</span>
                        <span>{formatCurrency((loanAmount * processingFeePercent) / 100)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-sm font-medium pt-2 border-t">
                      <span>Net Disbursement</span>
                      <span className="text-green-600">
                        {formatCurrency(loanAmount - (loanAmount * processingFeePercent) / 100)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
