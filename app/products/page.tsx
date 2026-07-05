"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { PiggyBank, CreditCard, TrendingUp, Calculator, Check, Info, Clock, Users, Percent } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { PublicNavbar } from "@/components/public-navbar"
import { PublicFooter } from "@/components/public-footer"
import { LoanCalculator } from "@/components/loan-calculator"
import { loansApi, type LoanProduct } from "@/lib/api-client"

const savingsProducts = [
  {
    name: "FOSA Savings",
    id: "fosa",
    description: "Flexible savings with instant access",
    interestRate: "7%",
    minBalance: "KES 500",
    features: ["Instant withdrawals", "ATM card access", "Mobile banking", "Standing orders"],
  },
  {
    name: "Fixed Deposit",
    id: "fixed-deposit",
    description: "Higher returns for committed savings",
    interestRate: "10-12%",
    minBalance: "KES 50,000",
    features: ["Fixed term: 3-12 months", "Higher interest rates", "Guaranteed returns", "Certificate issued"],
  },
  {
    name: "Holiday Savings",
    id: "holiday",
    description: "Save for your special occasions",
    interestRate: "8%",
    minBalance: "KES 1,000",
    features: ["Automatic deductions", "Release in November", "Bonus interest", "Gift vouchers"],
  },
]

function ProductsContent() {
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get("tab") || "savings"
  const [activeTab, setActiveTab] = React.useState(defaultTab)
  
  const [loanProducts, setLoanProducts] = React.useState<LoanProduct[]>([])
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    loansApi.getPublicProducts().then((result) => {
      if (cancelled) return
      setLoanProducts(result.success ? result.data ?? [] : [])
      setMounted(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  React.useEffect(() => {
    const tabParam = searchParams.get("tab")
    if (tabParam && ["savings", "loans", "investments"].includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  const formatMaxAmount = (product: LoanProduct) => `KES ${Number(product.maxAmount).toLocaleString()}`

  const formatInterestRate = (product: LoanProduct) => {
    const percent = (Number(product.interestRate) * 100).toFixed(1)
    return product.interestType === "FLAT" ? `${percent}% flat` : `${percent}% p.a. reducing`
  }

  const formatGuarantors = (product: LoanProduct) =>
    product.maxGuarantors > product.minGuarantors
      ? `${product.minGuarantors}-${product.maxGuarantors}`
      : `${product.minGuarantors}`

  const formatFees = (product: LoanProduct) => {
    const feePercent = Number(product.processingFeeRate) * 100
    return feePercent > 0 ? `Processing: ${feePercent.toFixed(1)}%` : "None"
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary/5 via-background to-secondary/10 py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">Our Products</h1>
              <p className="text-lg text-muted-foreground">
                Comprehensive financial solutions designed to meet your savings, credit, and investment needs.
              </p>
            </div>
          </div>
        </section>

        {/* Products Tabs */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mx-auto max-w-5xl">
              <TabsList className="mb-8 grid w-full grid-cols-3">
                <TabsTrigger value="savings" className="gap-2">
                  <PiggyBank className="h-4 w-4" />
                  <span className="hidden sm:inline">Savings</span>
                </TabsTrigger>
                <TabsTrigger value="loans" className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="hidden sm:inline">Loans</span>
                </TabsTrigger>
                <TabsTrigger value="investments" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Investments</span>
                </TabsTrigger>
              </TabsList>

              {/* Savings Tab */}
              <TabsContent value="savings">
                <div className="mb-8">
                  <h2 className="mb-2 text-2xl font-bold">Savings Accounts</h2>
                  <p className="text-muted-foreground">
                    Secure your future with our range of savings products
                  </p>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                  {savingsProducts.map((product) => (
                    <Card key={product.name} id={product.id} className="flex flex-col">
                      <CardHeader>
                        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <PiggyBank className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle>{product.name}</CardTitle>
                        <CardDescription>{product.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <div className="mb-4 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Interest Rate</span>
                            <span className="font-semibold text-primary">{product.interestRate} p.a.</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Min Balance</span>
                            <span className="font-medium">{product.minBalance}</span>
                          </div>
                        </div>
                        <ul className="space-y-2">
                          {product.features.map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-success" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full">Open Account</Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Loans Tab */}
              <TabsContent value="loans">
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="mb-2 text-2xl font-bold">Loan Products</h2>
                    <p className="text-muted-foreground">
                      Affordable credit solutions with competitive rates
                    </p>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Calculator className="h-4 w-4" />
                        Loan Calculator
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Loan Calculator</DialogTitle>
                      </DialogHeader>
                      <LoanCalculator className="border-0 shadow-none" />
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Loan Product Cards */}
                {mounted && loanProducts.length > 0 ? (
                  <div className="grid gap-6 md:grid-cols-2 mb-8">
                    {loanProducts.map((product) => (
                      <Card key={product.id} id={`loan-${product.id}`} className="relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full" />
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-primary" />
                                {product.name}
                              </CardTitle>
                              <CardDescription className="mt-1">
                                {product.description}
                              </CardDescription>
                            </div>
                            <Badge
                              variant="outline"
                              className="bg-primary/5 text-primary border-primary/20"
                            >
                              {formatInterestRate(product)}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <TrendingUp className="h-3 w-3" />
                                Max Amount
                              </div>
                              <p className="font-semibold">{formatMaxAmount(product)}</p>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                Max Tenure
                              </div>
                              <p className="font-semibold">{product.maxTenureMonths} months</p>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Users className="h-3 w-3" />
                                Guarantors
                              </div>
                              <p className="font-semibold">{formatGuarantors(product)} required</p>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Percent className="h-3 w-3" />
                                Fees
                              </div>
                              <p className="font-semibold">{formatFees(product)}</p>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter className="border-t bg-muted/30 pt-4">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" className="w-full gap-2">
                                <Calculator className="h-4 w-4" />
                                Calculate Repayment
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-lg">
                              <DialogHeader>
                                <DialogTitle>{product.name} Calculator</DialogTitle>
                              </DialogHeader>
                              <LoanCalculator
                                className="border-0 shadow-none"
                                defaultProductId={product.id}
                              />
                            </DialogContent>
                          </Dialog>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border mb-8">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Max Amount</TableHead>
                          <TableHead>Interest Rate</TableHead>
                          <TableHead>Max Tenure</TableHead>
                          <TableHead className="hidden md:table-cell">Guarantors</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Loading loan products...
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Loan Comparison Table */}
                {mounted && loanProducts.length > 0 && (
                  <Card className="mb-8">
                    <CardHeader>
                      <CardTitle>Product Comparison</CardTitle>
                      <CardDescription>
                        Compare all loan products at a glance
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead>Max Amount</TableHead>
                              <TableHead>Interest Rate</TableHead>
                              <TableHead>Tenure Range</TableHead>
                              <TableHead className="hidden md:table-cell">Guarantors</TableHead>
                              <TableHead className="hidden lg:table-cell">Fees</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loanProducts.map((product) => (
                              <TableRow key={product.id}>
                                <TableCell className="font-medium">{product.name}</TableCell>
                                <TableCell>{formatMaxAmount(product)}</TableCell>
                                <TableCell className="text-primary">
                                  {formatInterestRate(product)}
                                </TableCell>
                                <TableCell>{product.maxTenureMonths} months</TableCell>
                                <TableCell className="hidden md:table-cell">
                                  {formatGuarantors(product)}
                                </TableCell>
                                <TableCell className="hidden lg:table-cell text-muted-foreground">
                                  {formatFees(product)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5 text-primary" />
                      Loan Application Requirements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="grid gap-2 md:grid-cols-2">
                      {[
                        "Valid member for at least 3 months",
                        "Shares (BOSA) balance as per product",
                        "Required number of guarantors",
                        "Clear loan repayment history",
                        "Supporting documents for purpose",
                        "Completed application form",
                      ].map((req) => (
                        <li key={req} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 shrink-0 text-success" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Investments Tab */}
              <TabsContent value="investments">
                <div className="mb-8">
                  <h2 className="mb-2 text-2xl font-bold">Investment Products</h2>
                  <p className="text-muted-foreground">
                    Grow your wealth with our investment options
                  </p>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                  <Card id="bosa">
                    <CardHeader>
                      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <TrendingUp className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle>BOSA Shares</CardTitle>
                      <CardDescription>Build equity and earn dividends</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Dividend Rate (2024)</span>
                          <span className="font-semibold text-primary">14% p.a.</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Minimum Monthly</span>
                          <span className="font-medium">KES 1,000</span>
                        </div>
                        <ul className="space-y-2">
                          {["Ownership stake in SACCO", "Voting rights at AGM", "Loan collateral", "Annual dividends"].map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-success" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full">Start Investing</Button>
                    </CardFooter>
                  </Card>

                  <Card>
                    <CardHeader>
                      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <PiggyBank className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle>Money Market Fund</CardTitle>
                      <CardDescription>Partner fund for diversification</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Target Return</span>
                          <span className="font-semibold text-primary">11-13% p.a.</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Minimum Investment</span>
                          <span className="font-medium">KES 5,000</span>
                        </div>
                        <ul className="space-y-2">
                          {["Daily interest accrual", "No lock-in period", "Tax efficient", "Professional management"].map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-success" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full">Learn More</Button>
                    </CardFooter>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}

export default function ProductsPage() {
  return (
    <React.Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading products...</div>}>
      <ProductsContent />
    </React.Suspense>
  )
}

