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

import {
  type LoanProduct,
  type TenureUnit,
  getActiveLoanProducts,
  calculateLoanRepayment,
  formatTenure,
} from "@/lib/loan-products"

interface LoanCalculatorProps {
  className?: string
  defaultProductId?: string
}

export function LoanCalculator({ className, defaultProductId }: LoanCalculatorProps) {
  const [products, setProducts] = React.useState<LoanProduct[]>([])
  const [selectedProductId, setSelectedProductId] = React.useState<string>("")
  const [loanAmount, setLoanAmount] = React.useState<number>(100000)
  const [tenure, setTenure] = React.useState<number>(12)
  const [mounted, setMounted] = React.useState(false)

  // Load products on mount
  React.useEffect(() => {
    setMounted(true)
    const activeProducts = getActiveLoanProducts()
    setProducts(activeProducts)

    // Set default product
    if (activeProducts.length > 0) {
      const defaultProduct = defaultProductId
        ? activeProducts.find((p) => p.id === defaultProductId) || activeProducts[0]
        : activeProducts[0]
      setSelectedProductId(defaultProduct.id)
      setTenure(defaultProduct.minTenure)
    }
  }, [defaultProductId])

  // Get selected product
  const selectedProduct = products.find((p) => p.id === selectedProductId)

  // Update tenure when product changes
  React.useEffect(() => {
    if (selectedProduct) {
      // Clamp tenure to product limits
      const clampedTenure = Math.max(
        selectedProduct.minTenure,
        Math.min(tenure, selectedProduct.maxTenure)
      )
      setTenure(clampedTenure)

      // Adjust loan amount for fixed max amount products
      if (selectedProduct.maxAmount !== null && loanAmount > selectedProduct.maxAmount) {
        setLoanAmount(selectedProduct.maxAmount)
      }
    }
  }, [selectedProductId, selectedProduct])

  // Calculate repayment
  const calculation = React.useMemo(() => {
    if (!selectedProduct) return null

    return calculateLoanRepayment(
      loanAmount,
      selectedProduct.interestRate,
      selectedProduct.interestType,
      tenure,
      selectedProduct.tenureUnit
    )
  }, [selectedProduct, loanAmount, tenure])

  // Get max loan amount
  const getMaxLoanAmount = () => {
    if (!selectedProduct) return 1000000
    if (selectedProduct.maxAmount !== null) return selectedProduct.maxAmount
    // For multiplier-based products, use a reasonable default for display
    return 1000000
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Get tenure unit label
  const getTenureUnitLabel = (unit: TenureUnit, plural: boolean = true) => {
    const labels: Record<TenureUnit, { singular: string; plural: string }> = {
      days: { singular: "day", plural: "days" },
      weeks: { singular: "week", plural: "weeks" },
      months: { singular: "month", plural: "months" },
    }
    return plural ? labels[unit].plural : labels[unit].singular
  }

  // Get payment frequency label
  const getPaymentLabel = (unit: TenureUnit) => {
    switch (unit) {
      case "days":
        return "Daily Payment"
      case "weeks":
        return "Weekly Payment"
      case "months":
        return "Monthly Payment"
    }
  }

  // Get payment amount
  const getPaymentAmount = () => {
    if (!calculation || !selectedProduct) return 0
    switch (selectedProduct.tenureUnit) {
      case "days":
        return calculation.dailyPayment || 0
      case "weeks":
        return calculation.weeklyPayment || 0
      case "months":
        return calculation.monthlyPayment || 0
    }
  }

  if (!mounted) {
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
                      {product.interestRate}%{" "}
                      {product.interestType === "flat" ? "flat" : "p.m."}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedProduct && (
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
                      {selectedProduct.interestRate}%{" "}
                      {selectedProduct.interestType === "flat" ? "flat" : "reducing"}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    {selectedProduct.interestType === "flat"
                      ? "One-time interest on principal"
                      : "Monthly interest on reducing balance"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatTenure(selectedProduct.minTenure, selectedProduct.tenureUnit)} -{" "}
                      {formatTenure(selectedProduct.maxTenure, selectedProduct.tenureUnit)}
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
                      {selectedProduct.guarantorsRequired} guarantor
                      {selectedProduct.guarantorsRequired !== 1 ? "s" : ""}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>Required number of guarantors</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {(selectedProduct.processingFee > 0 || selectedProduct.insuranceFee > 0) && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="gap-1">
                        <Shield className="h-3 w-3" />
                        {selectedProduct.processingFee + selectedProduct.insuranceFee}% fees
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      Processing: {selectedProduct.processingFee}% | Insurance:{" "}
                      {selectedProduct.insuranceFee}%
                    </TooltipContent>
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
                  min={10000}
                  max={getMaxLoanAmount()}
                  step={1000}
                  value={loanAmount}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0
                    setLoanAmount(Math.min(value, getMaxLoanAmount()))
                  }}
                  className="font-mono"
                />
                <Slider
                  value={[loanAmount]}
                  onValueChange={([value]) => setLoanAmount(value)}
                  min={10000}
                  max={getMaxLoanAmount()}
                  step={5000}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatCurrency(10000)}</span>
                  <span>
                    {selectedProduct.maxAmount !== null
                      ? formatCurrency(selectedProduct.maxAmount)
                      : selectedProduct.maxMultiplier !== null
                        ? `Up to ${selectedProduct.maxMultiplier}x your BOSA`
                        : formatCurrency(getMaxLoanAmount())}
                  </span>
                </div>
              </div>

              {/* Tenure Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="tenure">
                    Repayment Period ({getTenureUnitLabel(selectedProduct.tenureUnit)})
                  </Label>
                  <span className="text-sm font-medium">
                    {formatTenure(tenure, selectedProduct.tenureUnit)}
                  </span>
                </div>
                <Input
                  id="tenure"
                  type="number"
                  min={selectedProduct.minTenure}
                  max={selectedProduct.maxTenure}
                  value={tenure}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || selectedProduct.minTenure
                    setTenure(
                      Math.max(
                        selectedProduct.minTenure,
                        Math.min(value, selectedProduct.maxTenure)
                      )
                    )
                  }}
                  className="font-mono"
                />
                <Slider
                  value={[tenure]}
                  onValueChange={([value]) => setTenure(value)}
                  min={selectedProduct.minTenure}
                  max={selectedProduct.maxTenure}
                  step={1}
                  className="mt-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatTenure(selectedProduct.minTenure, selectedProduct.tenureUnit)}</span>
                  <span>{formatTenure(selectedProduct.maxTenure, selectedProduct.tenureUnit)}</span>
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
                    <p className="text-xs text-muted-foreground">{getPaymentLabel(selectedProduct.tenureUnit)}</p>
                    <p className="text-lg font-semibold text-primary">
                      {formatCurrency(getPaymentAmount())}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Total Repayment</p>
                    <p className="text-lg font-semibold">{formatCurrency(calculation.totalRepayment)}</p>
                  </div>
                </div>

                {/* Fees Breakdown */}
                {(selectedProduct.processingFee > 0 || selectedProduct.insuranceFee > 0) && (
                  <div className="pt-3 border-t space-y-2">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Additional fees (deducted from disbursement)
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 text-sm">
                      {selectedProduct.processingFee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Processing Fee</span>
                          <span>
                            {formatCurrency((loanAmount * selectedProduct.processingFee) / 100)}
                          </span>
                        </div>
                      )}
                      {selectedProduct.insuranceFee > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Insurance Fee</span>
                          <span>
                            {formatCurrency((loanAmount * selectedProduct.insuranceFee) / 100)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between text-sm font-medium pt-2 border-t">
                      <span>Net Disbursement</span>
                      <span className="text-green-600">
                        {formatCurrency(
                          loanAmount -
                            (loanAmount * selectedProduct.processingFee) / 100 -
                            (loanAmount * selectedProduct.insuranceFee) / 100
                        )}
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
