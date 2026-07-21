"use client"

import * as React from "react"
import { Check, MoreHorizontal, Package, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency, loansApi, type LoanProduct, type LoanProductPayload } from "@/lib/api-client"

type ProductFormState = {
  name: string
  description: string
  minAmount: string
  maxAmount: string
  interestRatePercent: string
  interestType: "FLAT" | "REDUCING_BALANCE"
  maxTenureMonths: string
  processingFeePercent: string
  requiredAccountType: "FOSA" | "BOSA" | "COMBINED"
  savingsMultiplier: string
  minGuarantors: string
  maxGuarantors: string
  guarantorCoveragePercent: string
  requiresPayslip: boolean
  minActiveMonths: string
  gracePeriodMonths: string
  gracePeriodDays: string
  isActive: boolean
}

const emptyForm: ProductFormState = {
  name: "",
  description: "",
  minAmount: "1000",
  maxAmount: "500000",
  interestRatePercent: "12",
  interestType: "REDUCING_BALANCE",
  maxTenureMonths: "24",
  processingFeePercent: "1",
  requiredAccountType: "BOSA",
  savingsMultiplier: "3",
  minGuarantors: "1",
  maxGuarantors: "3",
  guarantorCoveragePercent: "100",
  requiresPayslip: false,
  minActiveMonths: "0",
  gracePeriodMonths: "0",
  gracePeriodDays: "14",
  isActive: true,
}

function decimalToPercent(value?: string | number | null): string {
  return String(Number(value ?? 0) * 100)
}

function productToForm(product: LoanProduct): ProductFormState {
  return {
    name: product.name,
    description: product.description ?? "",
    minAmount: String(Number(product.minAmount)),
    maxAmount: String(Number(product.maxAmount)),
    interestRatePercent: decimalToPercent(product.interestRate),
    interestType: product.interestType === "FLAT" ? "FLAT" : "REDUCING_BALANCE",
    maxTenureMonths: String(product.maxTenureMonths),
    processingFeePercent: decimalToPercent(product.processingFeeRate),
    requiredAccountType: product.requiredAccountType === "FOSA" || product.requiredAccountType === "BOSA"
      ? product.requiredAccountType
      : "COMBINED",
    savingsMultiplier: String(Number(product.savingsMultiplier ?? 3)),
    minGuarantors: String(product.minGuarantors ?? 1),
    maxGuarantors: String(product.maxGuarantors ?? 3),
    guarantorCoveragePercent: decimalToPercent(product.guarantorCoverageRatio),
    requiresPayslip: Boolean(product.requiresPayslip),
    minActiveMonths: String(product.minActiveMonths ?? 0),
    gracePeriodMonths: String(product.gracePeriodMonths ?? 0),
    gracePeriodDays: String(product.gracePeriodDays ?? 14),
    isActive: product.isActive,
  }
}

function toPayload(form: ProductFormState): LoanProductPayload {
  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    minAmount: Number(form.minAmount),
    maxAmount: Number(form.maxAmount),
    interestRate: Number(form.interestRatePercent) / 100,
    interestType: form.interestType,
    maxTenureMonths: Number(form.maxTenureMonths),
    processingFeeRate: Number(form.processingFeePercent || 0) / 100,
    requiredAccountType: form.requiredAccountType === "COMBINED" ? undefined : form.requiredAccountType,
    savingsMultiplier: Number(form.savingsMultiplier || 0),
    minGuarantors: Number(form.minGuarantors || 0),
    maxGuarantors: Number(form.maxGuarantors || 0),
    guarantorCoverageRatio: Number(form.guarantorCoveragePercent || 0) / 100,
    requiresPayslip: form.requiresPayslip,
    minActiveMonths: Number(form.minActiveMonths || 0),
    gracePeriodMonths: Number(form.gracePeriodMonths || 0),
    gracePeriodDays: Number(form.gracePeriodDays || 14),
    isActive: form.isActive,
  }
}

function validateForm(form: ProductFormState): string | null {
  if (!form.name.trim()) return "Product name is required"
  if (Number(form.minAmount) < 100) return "Minimum amount must be at least KES 100"
  if (Number(form.maxAmount) < Number(form.minAmount)) return "Maximum amount must be greater than or equal to minimum amount"
  if (Number(form.interestRatePercent) < 0) return "Interest rate cannot be negative"
  if (Number(form.maxTenureMonths) < 1) return "Maximum tenure must be at least 1 month"
  if (Number(form.maxGuarantors) > 0 && Number(form.minGuarantors) > Number(form.maxGuarantors)) {
    return "Minimum guarantors cannot exceed maximum guarantors"
  }
  return null
}

export default function AdminProductsPage() {
  const [products, setProducts] = React.useState<LoanProduct[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingProduct, setEditingProduct] = React.useState<LoanProduct | null>(null)
  const [form, setForm] = React.useState<ProductFormState>(emptyForm)

  const loadProducts = React.useCallback(async () => {
    setLoading(true)
    try {
      const result = await loansApi.getProducts(true)
      if (!result.success) throw new Error(result.error?.message ?? "Failed to load products")
      setProducts(result.data ?? [])
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message ?? "Failed to load products")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadProducts()
  }, [loadProducts])

  const openCreate = () => {
    setEditingProduct(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (product: LoanProduct) => {
    setEditingProduct(product)
    setForm(productToForm(product))
    setDialogOpen(true)
  }

  const updateForm = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const saveProduct = async () => {
    const validationError = validateForm(form)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setSaving(true)
    try {
      const payload = toPayload(form)
      const result = editingProduct
        ? await loansApi.updateProduct(editingProduct.id, payload)
        : await loansApi.createProduct(payload)

      if (!result.success) throw new Error(result.error?.message ?? "Could not save product")

      toast.success(editingProduct ? "Loan product updated" : "Loan product created")
      setDialogOpen(false)
      await loadProducts()
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message ?? "Could not save product")
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (product: LoanProduct) => {
    try {
      const result = await loansApi.updateProduct(product.id, { isActive: !product.isActive })
      if (!result.success) throw new Error(result.error?.message ?? "Could not update product status")
      toast.success(result.data.isActive ? "Product activated" : "Product deactivated")
      await loadProducts()
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message ?? "Could not update product status")
    }
  }

  const deactivateProduct = async (product: LoanProduct) => {
    try {
      const result = await loansApi.deactivateProduct(product.id)
      if (!result.success) throw new Error(result.error?.message ?? "Could not deactivate product")
      toast.success("Loan product deactivated")
      await loadProducts()
    } catch (error: unknown) {
      toast.error((error as { message?: string })?.message ?? "Could not deactivate product")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loan Products</h1>
          <p className="text-muted-foreground">
            Configure database-backed loan rules used by member applications and guarantor checks.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadProducts} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Configured Products
          </CardTitle>
          <CardDescription>
            Active products are visible to members. Deactivated products remain available for historical loans.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Interest</TableHead>
                    <TableHead>Guarantors</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No loan products configured.
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <p className="font-medium">{product.name}</p>
                          <p className="max-w-[260px] truncate text-xs text-muted-foreground">
                            {product.description ?? "No description"}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatCurrency(Number(product.minAmount))} - {formatCurrency(Number(product.maxAmount))}
                          <p className="text-xs text-muted-foreground">
                            {product.requiredAccountType ?? "COMBINED"} x {Number(product.savingsMultiplier ?? 0)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {(Number(product.interestRate) * 100).toFixed(2)}% {product.interestType.replace("_", " ")}
                          </Badge>
                          <p className="mt-1 text-xs text-muted-foreground">Max {product.maxTenureMonths} months</p>
                        </TableCell>
                        <TableCell className="text-sm">
                          {product.minGuarantors} - {product.maxGuarantors}
                          <p className="text-xs text-muted-foreground">
                            {(Number(product.guarantorCoverageRatio) * 100).toFixed(0)}% coverage
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch checked={product.isActive} onCheckedChange={() => toggleActive(product)} />
                            {product.isActive ? (
                              <span className="flex items-center gap-1 text-sm text-green-700"><Check className="h-4 w-4" />Active</span>
                            ) : (
                              <span className="flex items-center gap-1 text-sm text-muted-foreground"><X className="h-4 w-4" />Inactive</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(product)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => deactivateProduct(product)} className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Deactivate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Loan Product" : "Create Loan Product"}</DialogTitle>
            <DialogDescription>
              These rules are enforced by the backend during loan application and guarantor verification.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input id="name" value={form.name} onChange={(event) => updateForm("name", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountType">Required Savings Account</Label>
                <Select value={form.requiredAccountType} onValueChange={(value: ProductFormState["requiredAccountType"]) => updateForm("requiredAccountType", value)}>
                  <SelectTrigger id="accountType"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BOSA">BOSA</SelectItem>
                    <SelectItem value="FOSA">FOSA</SelectItem>
                    <SelectItem value="COMBINED">Combined / Product default</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={form.description} onChange={(event) => updateForm("description", event.target.value)} rows={2} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="minAmount">Minimum Amount</Label>
                <Input id="minAmount" type="number" min="100" value={form.minAmount} onChange={(event) => updateForm("minAmount", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxAmount">Maximum Amount</Label>
                <Input id="maxAmount" type="number" min="100" value={form.maxAmount} onChange={(event) => updateForm("maxAmount", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="savingsMultiplier">Savings Multiplier</Label>
                <Input id="savingsMultiplier" type="number" min="0" step="0.1" value={form.savingsMultiplier} onChange={(event) => updateForm("savingsMultiplier", event.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="interestRate">Annual Interest (%)</Label>
                <Input id="interestRate" type="number" min="0" step="0.01" value={form.interestRatePercent} onChange={(event) => updateForm("interestRatePercent", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interestType">Interest Type</Label>
                <Select value={form.interestType} onValueChange={(value: ProductFormState["interestType"]) => updateForm("interestType", value)}>
                  <SelectTrigger id="interestType"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REDUCING_BALANCE">Reducing Balance</SelectItem>
                    <SelectItem value="FLAT">Flat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxTenure">Max Tenure Months</Label>
                <Input id="maxTenure" type="number" min="1" value={form.maxTenureMonths} onChange={(event) => updateForm("maxTenureMonths", event.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="minGuarantors">Min Guarantors</Label>
                <Input id="minGuarantors" type="number" min="0" max="10" value={form.minGuarantors} onChange={(event) => updateForm("minGuarantors", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxGuarantors">Max Guarantors</Label>
                <Input id="maxGuarantors" type="number" min="0" max="10" value={form.maxGuarantors} onChange={(event) => updateForm("maxGuarantors", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coverage">Coverage Required (%)</Label>
                <Input id="coverage" type="number" min="0" step="1" value={form.guarantorCoveragePercent} onChange={(event) => updateForm("guarantorCoveragePercent", event.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="processingFee">Processing Fee (%)</Label>
                <Input id="processingFee" type="number" min="0" step="0.01" value={form.processingFeePercent} onChange={(event) => updateForm("processingFeePercent", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minActive">Min Active Months</Label>
                <Input id="minActive" type="number" min="0" value={form.minActiveMonths} onChange={(event) => updateForm("minActiveMonths", event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gracePeriod">Grace Period Months</Label>
                <Input id="gracePeriod" type="number" min="0" max="12" value={form.gracePeriodMonths} onChange={(event) => updateForm("gracePeriodMonths", event.target.value)} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="gracePeriodDays">Grace Period Days (Recovery)</Label>
                <Input id="gracePeriodDays" type="number" min="0" max="365" value={form.gracePeriodDays} onChange={(event) => updateForm("gracePeriodDays", event.target.value)} />
              </div>
            </div>

            <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
              <label className="flex items-center justify-between gap-3">
                <span>
                  <span className="block text-sm font-medium">Requires Payslip</span>
                  <span className="text-xs text-muted-foreground">Mark if staff should request payslip evidence.</span>
                </span>
                <Switch checked={form.requiresPayslip} onCheckedChange={(checked) => updateForm("requiresPayslip", checked)} />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span>
                  <span className="block text-sm font-medium">Active Product</span>
                  <span className="text-xs text-muted-foreground">Active products can be selected by members.</span>
                </span>
                <Switch checked={form.isActive} onCheckedChange={(checked) => updateForm("isActive", checked)} />
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveProduct} disabled={saving}>
              {saving ? "Saving..." : editingProduct ? "Save Changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
